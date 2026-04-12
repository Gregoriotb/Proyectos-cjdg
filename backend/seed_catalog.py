import sys
import os

# Asegurar que el path alcance los módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.service import Service
from models.catalog import CatalogItem

def seed():
    db = SessionLocal()
    services = db.query(Service).all()
    count = 0
    
    for srv in services:
        item = db.query(CatalogItem).filter(CatalogItem.service_id == srv.id).first()
        if not item:
            new_item = CatalogItem(
                service_id=srv.id, 
                price=0.00, 
                stock=50, 
                is_offer=False
            )
            db.add(new_item)
            count += 1
            
    db.commit()
    print(f"Catalog Seed completado. {count} productos de inventario atados a los servicios base.")

if __name__ == "__main__":
    seed()
