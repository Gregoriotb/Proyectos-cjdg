"""
[CONTEXT: SYSTEM_CORE] - Script de Ingestión de Catálogos PDF
Lee todos los PDFs en la carpeta /Catalogos/ y extrae productos para poblar la DB.
"""
import sys
import os
import re
import json
import pdfplumber
from pathlib import Path

# El script corre desde /app/scripts, necesita el parent (/app) para los módulos del backend
_HERE = os.path.dirname(os.path.abspath(__file__))
_APP  = os.path.dirname(_HERE)
sys.path.insert(0, _APP)

from database import SessionLocal
from models.service import Service
from models.catalog import CatalogItem

CATALOGS_BASE = "/catalogs"

# Mapeado de archivo PDF → pilar_id, categoria_base, marca
CATALOG_MAP = {
    "CAT CCTV PR CJDG.pdf":                      ("seguridad",    "Cámaras CCTV",         "Hikvision"),
    "Cat UBIQUITI PrCJDG.pdf":                   ("redes",        "Redes Inalámbricas",    "Ubiquiti"),
    "CATALOGO PC CLONES PrCJDG.pdf":             ("tecnologia",   "PCs y Equipos",         "Varios"),
    "Lista Precios 4-03-26 PrCJDG.pdf":          ("tecnologia",   "Lista de Precios",      "Varios"),
    "Lista SIEMON Pr CJDG.pdf":                  ("cableado",     "Cableado Estructurado", "Siemon"),
    "Lista Fibra Optica PrCJDG.pdf":             ("cableado",     "Fibra Óptica",          "Varios"),
    "Lista Acceso-Alarma PrCJDG.pdf":            ("seguridad",    "Control de Acceso",     "Varios"),
    "Lista EZVIZ Pr CJDG.pdf":                   ("seguridad",    "Cámaras IP",            "EZVIZ"),
    "CATALOGO DE SERVIDORES NUEVOS PR CJDG.pdf": ("servidores",   "Servidores Nuevos",     "Varios"),
    "CATALOGO SERVIDORES RENOVADOS PR CJDG.pdf": ("servidores",   "Servidores Renovados",  "Varios"),
    "CAT HUAWEI PrCJDG.pdf":                     ("redes",        "Equipos Huawei",        "Huawei"),
    "Lista GRANDSTREAM PrCJDG.pdf":              ("comunicacion", "VoIP / PBX",            "Grandstream"),
    "Lista MIKROTIK PrCJDG.pdf":                 ("redes",        "Routers y Switches",    "MikroTik"),
}

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:80]

def extract_products_from_pdf(pdf_path: Path, pilar_id: str, categoria: str, marca: str):
    """Extrae filas de productos de un PDF usando tablas detectadas."""
    products = []
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table or len(table) < 2:
                        continue
                    # La primera fila es encabezado
                    headers = [str(h).strip().lower() if h else "" for h in table[0]]
                    
                    for row in table[1:]:
                        if not row or all(cell is None or str(cell).strip() == '' for cell in row):
                            continue
                        
                        row_data = [str(c).strip() if c else "" for c in row]
                        
                        # Intentar mapear columnas a campos
                        product = {
                            "nombre": "",
                            "codigo_modelo": "",
                            "specs": {},
                            "precio_sugerido": None,
                        }
                        
                        for i, header in enumerate(headers):
                            if i >= len(row_data):
                                break
                            val = row_data[i]
                            if not val:
                                continue
                            
                            if any(k in header for k in ['descripci', 'nombre', 'producto', 'modelo', 'item', 'detalle', 'articulo']):
                                product["nombre"] = product["nombre"] or val
                            if any(k in header for k in ['código', 'code', 'cod', 'ref', 'p/n', 'part']):
                                product["codigo_modelo"] = product["codigo_modelo"] or val
                            if any(k in header for k in ['precio', 'price', '$', 'pvp', 'pvd', 'costo', 'valor']):
                                cleaned = re.sub(r'[^\d.,]', '', val)
                                if cleaned:
                                    try:
                                        cleaned = cleaned.replace(',', '.')
                                        product["precio_sugerido"] = float(cleaned)
                                    except:
                                        pass
                            else:
                                # Cualquier otra columna va a specs
                                if header and val:
                                    product["specs"][header] = val
                        
                        # Si no encontramos nombre de columna, usar posición 0 o 1
                        if not product["nombre"] and row_data:
                            product["nombre"] = row_data[0]
                        if not product["codigo_modelo"] and len(row_data) > 1:
                            product["codigo_modelo"] = row_data[1]
                        
                        if product["nombre"] and len(product["nombre"]) > 2:
                            products.append(product)
    except Exception as e:
        print(f"  ERROR leyendo {pdf_path.name}: {e}")
    
    return products

def find_all_pdfs(base_path: str):
    """Encuentra todos los PDFs en el directorio base y subdirectorios."""
    base = Path(base_path)
    all_pdfs = []
    
    def walk(folder: Path, depth=0):
        for item in sorted(folder.iterdir()):
            if item.is_file() and item.suffix.lower() == '.pdf':
                all_pdfs.append(item)
            elif item.is_dir() and depth < 3:
                walk(item, depth + 1)
    
    walk(base)
    return all_pdfs

def ingest():
    db = SessionLocal()
    total_inserted = 0
    total_updated = 0
    
    all_pdfs = find_all_pdfs(CATALOGS_BASE)
    print(f"\nEncontrados {len(all_pdfs)} PDFs para procesar.\n")
    
    for pdf_path in all_pdfs:
        filename = pdf_path.name
        mapping = CATALOG_MAP.get(filename)
        
        if mapping:
            pilar_id, categoria, marca = mapping
        else:
            # Inferir desde el nombre del archivo
            pilar_id = "general"
            categoria = filename.replace(".pdf", "").replace("Pr CJDG", "").strip()
            marca = "Varios"
        
        print(f"Procesando: {filename} [{pilar_id} / {categoria}]")
        products = extract_products_from_pdf(pdf_path, pilar_id, categoria, marca)
        print(f"  → {len(products)} productos detectados")
        
        for i, prod in enumerate(products):
            nombre = prod["nombre"][:250].strip()
            if not nombre:
                continue
            
            # Generar un service_id único
            base_slug = slugify(f"{pilar_id}-{nombre}")
            service_id = f"{base_slug}-{i+1}"
            
            existing = db.query(Service).filter(
                (Service.service_id == service_id) |
                ((Service.nombre == nombre) & (Service.pilar_id == pilar_id))
            ).first()
            
            if existing:
                # Actualizar si tiene menos info
                existing.marca = existing.marca or marca
                existing.codigo_modelo = existing.codigo_modelo or prod["codigo_modelo"]
                if prod["specs"]:
                    existing.specs = {**(existing.specs or {}), **prod["specs"]}
                total_updated += 1
            else:
                nuevo = Service(
                    service_id=service_id,
                    pilar_id=pilar_id,
                    nombre=nombre,
                    categoria=categoria,
                    marca=marca,
                    codigo_modelo=prod["codigo_modelo"] or None,
                    specs=prod["specs"] if prod["specs"] else None,
                )
                db.add(nuevo)
                db.flush()
                
                # Crear el CatalogItem asociado
                cat_item = CatalogItem(
                    service_id=nuevo.id,
                    price=prod["precio_sugerido"],
                    stock=0,
                    is_available=True,
                )
                db.add(cat_item)
                total_inserted += 1
    
    db.commit()
    db.close()
    
    print(f"\n✅ Ingestión completada.")
    print(f"   {total_inserted} productos nuevos insertados.")
    print(f"   {total_updated} productos existentes actualizados.")

if __name__ == "__main__":
    ingest()
