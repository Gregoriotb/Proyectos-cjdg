"""
[CONTEXT: ADMIN_CONSOLE] - Admin Export API
SC-ADMIN-EXPORT-01: Endpoints individuales por servicio.

Endpoints (todos requieren auth admin: X-API-Key o Bearer JWT):
  GET /admin/export/users         → Solo usuarios
  GET /admin/export/invoices      → Solo facturas + items
  GET /admin/export/catalog       → Solo catálogo de productos
  GET /admin/export/services      → Solo catálogo corporativo de servicios
  GET /admin/export/quotations    → Solo threads de cotización + mensajes
  GET /admin/export/notifications → Solo notificaciones
  GET /admin/export/settings      → Solo ecommerce settings
  GET /admin/export/summary       → Solo totales/resumen

Excluye: hashed_password, oauth_id, key_hash. Expone has_password como bool.
"""
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, selectinload

from database import get_db
from dependencies import get_admin_via_any_auth
from models.catalog import CatalogItem
from models.chat_quotation import ChatMessage, QuotationThread
from models.ecommerce_settings import EcommerceSettings
from models.invoice import Invoice, InvoiceItem
from models.notification import Notification
from models.service import Service
from models.service_catalog import ServiceCatalog
from models.user import User

router = APIRouter()


# --------------------------------------------------------------
# Serializadores (JSON-safe)
# --------------------------------------------------------------
def _iso(dt) -> Optional[str]:
    return dt.isoformat() if dt else None


def _dec(value) -> Optional[str]:
    if value is None:
        return None
    return str(Decimal(str(value)))


def _serialize_user(u: User) -> Dict[str, Any]:
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
        "invoice_type": inv.invoice_type.value if inv.invoice_type else None,
        "status": inv.status.value if inv.status else None,
        "total": _dec(inv.total),
        "notas": inv.notas,
        "quotation_id": inv.quotation_id,
        "created_at": _iso(getattr(inv, "created_at", None)),
        "updated_at": _iso(getattr(inv, "updated_at", None)),
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


def _serialize_chat_message(m: ChatMessage) -> Dict[str, Any]:
    return {
        "id": str(m.id),
        "thread_id": str(m.thread_id),
        "sender_type": m.sender_type,
        "sender_id": str(m.sender_id) if m.sender_id else None,
        "content": m.content,
        "message_type": m.message_type,
        "attachment_url": m.attachment_url,
        "attachment_name": m.attachment_name,
        "attachment_type": m.attachment_type,
        "metadata": m.message_metadata or {},
        "read_at": _iso(m.read_at),
        "created_at": _iso(m.created_at),
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
        "messages": [_serialize_chat_message(m) for m in messages],
    }


def _serialize_notification(n: Notification) -> Dict[str, Any]:
    return {
        "id": str(n.id),
        "user_id": str(n.user_id),
        "type": n.type,
        "title": n.title,
        "message": n.message,
        "metadata": n.notification_metadata or {},
        "is_read": n.is_read,
        "created_at": _iso(n.created_at),
    }


def _serialize_settings(s: EcommerceSettings) -> Dict[str, Any]:
    return {c.name: getattr(s, c.name) for c in s.__table__.columns}


# --------------------------------------------------------------
# Loaders (queries reusables)
# --------------------------------------------------------------
def _load_users(db: Session) -> List[Dict[str, Any]]:
    return [_serialize_user(u) for u in db.query(User).all()]


def _load_invoices(db: Session) -> List[Dict[str, Any]]:
    invoices = db.query(Invoice).options(selectinload(Invoice.items)).all()
    return [_serialize_invoice(i) for i in invoices]


def _load_catalog(db: Session) -> List[Dict[str, Any]]:
    catalog_items = db.query(CatalogItem).all()
    service_ids = {c.service_id for c in catalog_items if c.service_id}
    services = db.query(Service).filter(Service.id.in_(service_ids)).all() if service_ids else []
    service_by_id = {s.id: s for s in services}
    return [_serialize_catalog_item(c, service_by_id) for c in catalog_items]


def _load_services(db: Session) -> List[Dict[str, Any]]:
    return [_serialize_service_catalog(s) for s in db.query(ServiceCatalog).all()]


def _load_quotations(db: Session) -> List[Dict[str, Any]]:
    threads = db.query(QuotationThread).options(selectinload(QuotationThread.messages)).all()
    return [_serialize_thread(t) for t in threads]


def _load_notifications(db: Session) -> List[Dict[str, Any]]:
    return [_serialize_notification(n) for n in db.query(Notification).all()]


def _load_settings(db: Session) -> List[Dict[str, Any]]:
    return [_serialize_settings(s) for s in db.query(EcommerceSettings).all()]


def _build_summary(db: Session) -> Dict[str, Any]:
    users = db.query(User).all()
    invoices = db.query(Invoice).all()
    catalog_count = db.query(CatalogItem).count()
    services_count = db.query(ServiceCatalog).count()
    threads = db.query(QuotationThread).options(selectinload(QuotationThread.messages)).all()
    notifications = db.query(Notification).all()

    total_revenue = sum(
        float(inv.total or 0)
        for inv in invoices
        if inv.status and inv.status.value == "PAID"
    )
    clients_count = sum(1 for u in users if u.role and u.role.value.lower() == "cliente")
    total_messages = sum(len(t.messages or []) for t in threads)
    unread_notifs = sum(1 for n in notifications if not n.is_read)

    return {
        "total_users": len(users),
        "total_clients": clients_count,
        "total_invoices": len(invoices),
        "total_paid_revenue": total_revenue,
        "total_catalog_items": catalog_count,
        "total_corporate_services": services_count,
        "total_quotation_threads": len(threads),
        "total_chat_messages": total_messages,
        "total_notifications": len(notifications),
        "unread_notifications": unread_notifs,
    }


# --------------------------------------------------------------
# Endpoints separados por servicio
# --------------------------------------------------------------
@router.get("/export/users")
def export_users(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_users(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "users": data}


@router.get("/export/invoices")
def export_invoices(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_invoices(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "invoices": data}


@router.get("/export/catalog")
def export_catalog(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_catalog(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "catalog": data}


@router.get("/export/services")
def export_services(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_services(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "service_catalog": data}


@router.get("/export/quotations")
def export_quotations(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_quotations(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "quotations": data}


@router.get("/export/notifications")
def export_notifications(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_notifications(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "notifications": data}


@router.get("/export/settings")
def export_settings(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    data = _load_settings(db)
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "count": len(data), "ecommerce_settings": data}


@router.get("/export/summary")
def export_summary(
    admin_user: User = Depends(get_admin_via_any_auth),
    db: Session = Depends(get_db),
):
    return {"exported_at": datetime.now(timezone.utc).isoformat(), "summary": _build_summary(db)}


