from database import Base
from .user import User
from .service import Service
from .catalog import CatalogItem
from .cart import Cart, CartItem
from .quotation import Quotation, QuotationItem
from .ecommerce_settings import EcommerceSettings
from .service_catalog import ServiceCatalog
from .invoice import Invoice, InvoiceItem
from .chat_quotation import QuotationThread, ChatMessage
from .notification import Notification
from .api_key import ApiKey
from .transaction_history import TransactionHistory, TransactionHistoryItem
from .stock_movement import StockMovement

# Esto permite que Alembic lea todos los modelos importando solo __init__
