import logging
from datetime import datetime
from sqlalchemy.orm import Session
from app.repositories.navigation import NavigationRepository
from app.services.routing_engine import AdjacencyGraph, RoutingEngine
from app.schemas.navigation import RouteRequest, RouteResponse, RerouteRequest, RouteNodeResponse
from app.core.redis_client import redis_client
from app.core.kafka_client import kafka_client
from shared.utils.error_handlers import ValidationError
from typing import Set, Tuple

logger = logging.getLogger("fastapi")

class NavigationService:
    def __init__(self, db: Session):
        self.repo = NavigationRepository(db)
        self.db = db

    def _build_engine_graph(self) -> RoutingEngine:
        # Load map graph from Database
        nodes = self.repo.get_all_nodes()
        edges = self.repo.get_all_edges()

        # Seed default map configurations if DB is completely empty (Dev fallbacks)
        if not nodes:
            from app.models.navigation import MapNode, MapEdge
            n1 = MapNode(id="NODE-GATE-A", name="Entrance Gate A", zone_id="ZONE_GATE_A", type="Gate", x=0.0, y=0.0, floor="1", is_wheelchair_accessible=True)
            n2 = MapNode(id="NODE-CONC-1", name="Concourse Section 104", zone_id="ZONE_SEC_104", type="Concourse", x=10.0, y=10.0, floor="1", is_wheelchair_accessible=True)
            n3 = MapNode(id="NODE-SEAT-1", name="Seat Section 104 Row A", zone_id="ZONE_SEC_104", type="Seat", x=20.0, y=15.0, floor="1", is_wheelchair_accessible=False)
            
            self.repo.create_node(n1)
            self.repo.create_node(n2)
            self.repo.create_node(n3)
            
            e1 = MapEdge(source_node_id="NODE-GATE-A", target_node_id="NODE-CONC-1", distance=15.0, base_weight=1.0, current_weight=1.0, is_wheelchair_accessible=True)
            e2 = MapEdge(source_node_id="NODE-CONC-1", target_node_id="NODE-SEAT-1", distance=8.0, base_weight=1.0, current_weight=1.0, is_wheelchair_accessible=False)
            
            self.repo.create_edge(e1)
            self.repo.create_edge(e2)
            
            nodes = [n1, n2, n3]
            edges = [e1, e2]

        graph = AdjacencyGraph()
        for node in nodes:
            graph.add_node(node)
        for edge in edges:
            graph.add_edge(edge)

        return RoutingEngine(graph)

    def _fetch_congestion_and_hazard_zones(self) -> Tuple[Set[str], Set[str]]:
        # Fetch active congestion zones from Redis
        congested = set()
        # Mock active zones (In production, read keys: stadiumos:zone:*:status)
        # Check active incident hazard areas
        emergencies = set()
        return congested, emergencies

    async def calculate_route(self, req: RouteRequest) -> RouteResponse:
        cache_key = f"nav:route:{req.start_node_id}:{req.end_node_id}:{req.routing_profile}:{req.requires_accessibility}"
        cached = redis_client.get_cache(cache_key)
        if cached:
            return RouteResponse(**cached)

        engine = self._build_engine_graph()
        congested, emergencies = self._fetch_congestion_and_hazard_zones()

        outcome = engine.find_optimal_path(
            start_id=req.start_node_id,
            end_id=req.end_node_id,
            profile=req.routing_profile,
            requires_accessibility=req.requires_accessibility,
            congested_zones=congested,
            emergency_zones=emergencies
        )

        if not outcome:
            raise ValidationError("A viable path connecting target coordinates could not be calculated.")

        path_nodes, distance, est_time = outcome

        formatted_nodes = [
            RouteNodeResponse(
                id=n.id,
                name=n.name,
                zone_id=n.zone_id,
                type=n.type,
                floor=n.floor
            )
            for n in path_nodes
        ]

        res = RouteResponse(
            path_nodes=formatted_nodes,
            total_distance_meters=distance,
            estimated_time_seconds=est_time,
            routing_profile=req.routing_profile,
            confidence_score=0.95,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

        # Cache Route & Publish Event
        redis_client.set_cache(cache_key, res.dict(), ttl=60)
        kafka_client.publish_event(
            "stadiumos.navigation.route-generated",
            key=req.start_node_id,
            payload=res.dict()
        )

        return res

    async def calculate_reroute(self, req: RerouteRequest) -> RouteResponse:
        engine = self._build_engine_graph()
        congested, emergencies = self._fetch_congestion_and_hazard_zones()

        # Add manual avoidance zones to emergency/hazard filter set
        for zone in req.avoid_zones:
            emergencies.add(zone)

        outcome = engine.find_optimal_path(
            start_id=req.current_node_id,
            end_id=req.end_node_id,
            profile="Shortest",
            requires_accessibility=req.requires_accessibility,
            congested_zones=congested,
            emergency_zones=emergencies
        )

        if not outcome:
            raise ValidationError("A viable reroute path avoiding target zones could not be calculated.")

        path_nodes, distance, est_time = outcome

        formatted_nodes = [
            RouteNodeResponse(
                id=n.id,
                name=n.name,
                zone_id=n.zone_id,
                type=n.type,
                floor=n.floor
            )
            for n in path_nodes
        ]

        res = RouteResponse(
            path_nodes=formatted_nodes,
            total_distance_meters=distance,
            estimated_time_seconds=est_time,
            routing_profile="Rerouted",
            confidence_score=0.91,
            timestamp=datetime.utcnow().isoformat() + "Z"
        )

        # Publish RouteUpdated Event
        kafka_client.publish_event(
            "stadiumos.navigation.route-updated",
            key=req.current_node_id,
            payload=res.dict()
        )

        return res
