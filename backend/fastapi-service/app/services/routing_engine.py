import heapq
from typing import Dict, List, Tuple, Set, Optional
from app.models.navigation import MapNode, MapEdge

class AdjacencyGraph:
    def __init__(self):
        # Maps node_id -> list of tuples (target_node_id, distance, base_weight, current_weight, edge_accessible)
        self.adj: Dict[str, List[Tuple[str, float, float, float, bool]]] = {}
        # Maps node_id -> node object
        self.nodes: Dict[str, MapNode] = {}

    def add_node(self, node: MapNode):
        self.nodes[node.id] = node
        if node.id not in self.adj:
            self.adj[node.id] = []

    def add_edge(self, edge: MapEdge):
        if edge.source_node_id in self.adj:
            self.adj[edge.source_node_id].append((
                edge.target_node_id,
                edge.distance,
                edge.base_weight,
                edge.current_weight,
                edge.is_wheelchair_accessible
            ))

class RoutingEngine:
    def __init__(self, graph: AdjacencyGraph):
        self.graph = graph

    def _calculate_edge_weight(
        self,
        distance: float,
        base_weight: float,
        current_weight: float,
        profile: str,
        target_zone: str,
        congested_zones: Set[str],
        emergency_zones: Set[str]
    ) -> float:
        # Enforce severe cost penalties on edges crossing emergency hazard zones
        if target_zone in emergency_zones:
            return float('inf')

        congestion_multiplier = 1.0
        if target_zone in congested_zones:
            congestion_multiplier = 3.0 # Substantially scale traversal cost

        if profile == "Shortest":
            return distance
        elif profile == "Fastest":
            # Distance scaled by speed factors and congestion multipliers
            return distance * base_weight * current_weight * congestion_multiplier
        elif profile == "Safest":
            # Avoid any medium-severity zone warnings by applying high weight costs
            safety_penalty = 5.0 if target_zone in congested_zones else 1.0
            return distance * safety_penalty
        elif profile == "LeastCrowded":
            return distance * congestion_multiplier * current_weight
        else:
            return distance

    def find_optimal_path(
        self,
        start_id: str,
        end_id: str,
        profile: str = "Shortest",
        requires_accessibility: bool = False,
        congested_zones: Set[str] = None,
        emergency_zones: Set[str] = None
    ) -> Optional[Tuple[List[MapNode], float, float]]:
        
        congested_zones = congested_zones or set()
        emergency_zones = emergency_zones or set()

        if start_id not in self.graph.nodes or end_id not in self.graph.nodes:
            return None

        # Accessibility checks
        if requires_accessibility:
            if not self.graph.nodes[start_id].is_wheelchair_accessible:
                return None
            if not self.graph.nodes[end_id].is_wheelchair_accessible:
                return None

        # Dijkstra algorithm implementation
        # Priority Queue holds tuples: (cumulative_cost, current_node_id, path_list)
        pq: List[Tuple[float, str, List[str]]] = [(0.0, start_id, [start_id])]
        visited: Set[str] = set()

        while pq:
            cost, current, path = heapq.heappop(pq)

            if current == end_id:
                path_nodes = [self.graph.nodes[nid] for nid in path]
                
                # Estimate aggregate metrics
                total_distance = 0.0
                for i in range(len(path) - 1):
                    source = path[i]
                    target = path[i+1]
                    # Find edge distance
                    for edge_target, dist, _, _, _ in self.graph.adj[source]:
                        if edge_target == target:
                            total_distance += dist
                            break
                            
                # Average speed inside concourses ~ 1.2 m/s
                est_time = (total_distance / 1.2) * (cost / (total_distance + 0.001)) if total_distance > 0 else 0
                return path_nodes, total_distance, est_time

            if current in visited:
                continue
            visited.add(current)

            for target, dist, base, curr, accessible in self.graph.adj[current]:
                if target in visited:
                    continue
                    
                # Accessibility constraints filter
                if requires_accessibility:
                    if not accessible or not self.graph.nodes[target].is_wheelchair_accessible:
                        continue

                target_zone = self.graph.nodes[target].zone_id
                edge_cost = self._calculate_edge_weight(
                    dist, base, curr, profile, target_zone, congested_zones, emergency_zones
                )

                if edge_cost == float('inf'):
                    continue

                heapq.heappush(pq, (cost + edge_cost, target, path + [target]))

        return None
