from sqlalchemy.orm import Session
from app.models.navigation import MapNode, MapEdge
from typing import List, Optional

class NavigationRepository:
    def __init__(self, db: Session):
        self.db = db

    def get_node(self, node_id: str) -> Optional[MapNode]:
        return self.db.query(MapNode).filter(MapNode.id == node_id).first()

    def get_all_nodes(self) -> List[MapNode]:
        return self.db.query(MapNode).all()

    def get_all_edges(self) -> List[MapEdge]:
        return self.db.query(MapEdge).all()

    def get_edges_by_source(self, source_id: str) -> List[MapEdge]:
        return self.db.query(MapEdge).filter(MapEdge.source_node_id == source_id).all()

    def update_edge_weight(self, edge_id: str, new_weight: float) -> Optional[MapEdge]:
        edge = self.db.query(MapEdge).filter(MapEdge.id == edge_id).first()
        if edge:
            edge.current_weight = new_weight
            self.db.commit()
            self.db.refresh(edge)
        return edge

    def create_node(self, node: MapNode) -> MapNode:
        self.db.add(node)
        self.db.commit()
        self.db.refresh(node)
        return node

    def create_edge(self, edge: MapEdge) -> MapEdge:
        self.db.add(edge)
        self.db.commit()
        self.db.refresh(edge)
        return edge
