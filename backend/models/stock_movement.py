"""
[CONTEXT: HISTORIAL_TRANSACCIONES_V2.4]
Log de movimientos de inventario.
Cada acción del stock_service deja huella aquí (auditoría + debugging).
"""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from database import Base


class StockMovement(Base):
    __tablename__ = "stock_movements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    catalog_item_id = Column(Integer, ForeignKey("catalog_items.id", ondelete="CASCADE"), nullable=False, index=True)

    # 'reserve' | 'release' | 'confirm'
    movement_type = Column(String(20), nullable=False)
    quantity = Column(Integer, nullable=False)  # signed: positivo reserva, negativo libera

    reference_type = Column(String(30), nullable=True)  # 'invoice' | 'manual'
    reference_id = Column(String(50), nullable=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    notes = Column(String(500), nullable=True)

    created_at = Column(DateTime(timezone=True), nullable=False, server_default=func.now())

    catalog_item = relationship("CatalogItem")
    user = relationship("User")
