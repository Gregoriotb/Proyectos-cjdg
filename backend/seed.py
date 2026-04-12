"""
[CONTEXT: SYSTEM_CORE] - Database Seeder
Puebla la base de datos con los servicios del brochure (Ancla de Verdad)
"""
import json
import os
from sqlalchemy.orm import Session
from database import SessionLocal
from models.service import Service

BROCHURE_PATH = os.path.join(os.path.dirname(__file__), "brochure_knowledge.json")

def print_success(msg):
    print(f"\033[92m{msg}\033[0m")

def seed_database(db: Session):
    print("Iniciando Seed de la Base de Datos desde el Brochure...")
    
    if not os.path.exists(BROCHURE_PATH):
        print("El archivo brochure_knowledge.json no se encuentra.")
        return

    with open(BROCHURE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    pilares = data.get("pilares", [])
    servicios_agregados = 0

    for pilar in pilares:
        pilar_id = pilar.get("id")
        servicios = pilar.get("servicios", [])
        
        for srv in servicios:
            existing_service = db.query(Service).filter(Service.service_id == srv["id"]).first()
            if not existing_service:
                nuevo_servicio = Service(
                    service_id=srv["id"],
                    pilar_id=pilar_id,
                    nombre=srv["nombre"],
                    categoria=srv["categoria"]
                )
                db.add(nuevo_servicio)
                servicios_agregados += 1
    
    db.commit()
    print_success(f"Seed completado. {servicios_agregados} servicios agregados como Ancla de Verdad.")

if __name__ == "__main__":
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
