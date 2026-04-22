"""
[CONTEXT: ADMIN_CONSOLE] - Admin Export API
SC-ADMIN-EXPORT-01: Endpoint unificado para reportes/backups.

GET /admin/export-all
  - Solo admin
  - Retorna JSON con: usuarios (sin hashes), catálogo, service_catalog,
    facturas con items, cotizaciones con counts de mensajes.
  - Cache en memoria por 5 min (query param ?refresh=true lo bypassea).
  - selectinload para evitar N+1 en relaciones.
"""
import time
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies import get_current_admin
from models.catalog import CatalogItem
from models.chat_quotation import ChatMessage, QuotationThread
from models.invoice import Invoice, InvoiceItem
from models.service import Service
from models.service_catalog import ServiceCatalog
from models.user import User

router = APIRouter()

# --------------------------------------------------------------
# Cache en memoria (proceso único). Para multi-worker usar Redis.
# --------------------------------------------------------------
CACHE_TTL_SECONDS = 300
_cache: Dict[str, Any] = {"data": None, "ts": 0.0}


def _cache_get() -> Optional[Dict[str, Any]]:
    if _cache["data"] is None:
        return None
    if time.time() - _cache["ts"] > CACHE_TTL_SECONDS:
        return None
    return _cache["data"]


def _cache_set(data: Dict[str, Any]) -> None:
    _cache["data"] = data
    _cache["ts"] = time.time()


# --------------------------------------------------------------
# Serializadores (dict-safe: sin UUID/Decimal/datetime nativos)
# --------------------------------------------------------------
def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


def _dec(value) -> Optional[str]:
    if value is None:
        return None
    return str(Decimal(str(value)))


def _serialize_user(u: User) -> Dict[str, Any]:
    """Excluye hashed_password y oauth_id (información sensible)."""
    return {
        "id": str(u.id),
        "username": u.username,
        "email": u.email,
        "full_name": u.full_name,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "phone": u.phone,
        "role": u.role.value if u.role else None,
        "is_active": u.is_active,
        "account_type": u.account_type,
        "company_name": u.company_name,
        "fiscal_address": u.fiscal_address,
        "rif": u.rif,
        "rif_file_url": u.rif_file_url,
        "profile_photo_url": u.profile_photo_url,
        "oauth_provider": u.oauth_provider,
        "has_password": u.hashed_password is not None,
    }


def _serialize_invoice_item(item: InvoiceItem) -> Dict[str, Any]:
    return {
        "id": item.id,
        "descripcion": item.descripcion,
        "cantidad": item.cantidad,
        "precio_unitario": _dec(item.precio_unitario),
        "subtotal": _dec(item.subtotal),
    }


def _serialize_invoice(inv: Invoice) -> Dict[str, Any]:
    return {
        "id": inv.id,
        "user_id": str(inv.user_id),
        "type": inv.type.value if inv.type else None,
        "status": inv.status.value if inv.status else None,
        "total": _dec(inv.total),
        "notas": inv.notas,
        "created_at": _iso(getattr(inv, "created_at", None)),
        "items": [_serialize_invoice_item(i) for i in (inv.items or [])],
    }


def _serialize_catalog_item(c: CatalogItem, service_by_id: Dict[int, Service]) -> Dict[str, Any]:
    srv = service_by_id.get(c.service_id)
    return {
        "id": c.id,
        "service_id": c.service_id,
        "service_name": srv.nombre if srv else None,
        "service_codigo": getattr(srv, "codigo_modelo", None) if srv else None,
        "pilar_id": getattr(srv, "pilar_id", None) if srv else None,
        "price": _dec(c.price),
        "stock": c.stock,
        "is_offer": c.is_offer,
        "discount_percentage": float(c.discount_percentage or 0),
        "is_special": getattr(c, "is_special", None),
        "image_urls": getattr(c, "image_urls", []) or [],
    }


def _serialize_service_catalog(s: ServiceCatalog) -> Dict[str, Any]:
    return {
        "id": s.id,
        "nombre": s.nombre,
        "pilar": s.pilar.value if s.pilar else None,
        "descripcion": getattr(s, "descripcion", None),
        "image_urls": getattr(s, "image_urls", []) or [],
        "is_special": getattr(s, "is_special", None),
    }


def _serialize_thread(t: QuotationThread) -> Dict[str, Any]:
    messages = t.messages or []
    return {
        "id": str(t.id),
        "client_id": str(t.client_id),
        "service_id": t.service_id,
        "service_name": t.service_name,
        "status": t.status,
        "budget_estimate": _dec(getattr(t, "budget_estimate", None)),
        "created_at": _iso(t.created_at),
        "updated_at": _iso(t.updated_at),
        "last_message_at": _iso(t.last_message_at),
        "message_count": len(messages),
    }


# --------------------------------------------------------------
# Endpoint
# --------------------------------------------------------------
@router.get("/export-all")
def export_all(
    refresh: bool = Query(False, description="Forzar refresh, ignorar cache"),
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Export unificado: usuarios + catálogo + servicios + facturas + cotizaciones.
    Cache 5 min. Usar ?refresh=true para forzar recálculo.
    """
    if not refresh:
        cached = _cache_get()
        if cached is not None:
            return {**cached, "cache_hit": True}

    # Fetches con selectinload para evitar N+1
    users: List[User] = db.query(User).all()

    invoices: List[Invoice] = (
        db.query(Invoice)
        .options(selectinload(Invoice.items))
        .all()
    )

    catalog_items: List[CatalogItem] = db.query(CatalogItem).all()
    # Mapa service_id → Service para joinear sin N+1
    service_ids = {c.service_id for c in catalog_items if c.service_id}
    services = db.query(Service).filter(Service.id.in_(service_ids)).all() if service_ids else []
    service_by_id = {s.id: s for s in services}

    service_catalog: List[ServiceCatalog] = db.query(ServiceCatalog).all()

    threads: List[QuotationThread] = (
        db.query(QuotationThread)
        .options(selectinload(QuotationThread.messages))
        .all()
    )

    # Métricas agregadas rápidas
    total_revenue = sum(
        float(inv.total or 0)
        for inv in invoices
        if inv.status and inv.status.value == "PAID"
    )
    clients_count = sum(1 for u in users if u.role and u.role.value.lower() == "cliente")

    data = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "total_users": len(users),
            "total_clients": clients_count,
            "total_invoices": len(invoices),
            "total_paid_revenue": total_revenue,
            "total_catalog_items": len(catalog_items),
            "total_corporate_services": len(service_catalog),
            "total_quotation_threads": len(threads),
        },
        "users": [_serialize_user(u) for u in users],
        "invoices": [_serialize_invoice(i) for i in invoices],
        "catalog": [_serialize_catalog_item(c, service_by_id) for c in catalog_items],
        "service_catalog": [_serialize_service_catalog(s) for s in service_catalog],
        "quotations": [_serialize_thread(t) for t in threads],
    }

    _cache_set(data)
    return {**data, "cache_hit": False}
