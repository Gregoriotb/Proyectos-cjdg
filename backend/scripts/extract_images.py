"""
[CONTEXT: SYSTEM_CORE] - Refinamiento y Extracción Avanzada de Imágenes
Usa PyMuPDF para extraer las imágenes directamente de los PDFs y parearlas.
"""
import sys
import os
import fitz  # PyMuPDF
import io
from PIL import Image
from pathlib import Path

# Configurar imports del backend
_HERE = os.path.dirname(os.path.abspath(__file__))
_APP  = os.path.dirname(_HERE)
sys.path.insert(0, _APP)

from database import SessionLocal
from models.service import Service

CATALOGS_BASE = "/catalogs"
STATIC_DIR = os.path.join(_APP, "static", "products")

# Mapeado similar al de la ingestión original
CATALOG_MAP = {
    "CAT CCTV PR CJDG.pdf":                      "seguridad",
    "Cat UBIQUITI PrCJDG.pdf":                   "redes",
    "CATALOGO PC CLONES PrCJDG.pdf":             "servidores",
    "Lista Precios 4-03-26 PrCJDG.pdf":          "tecnologia",
    "Lista SIEMON Pr CJDG.pdf":                  "cableado",
    "Lista Fibra Optica PrCJDG.pdf":             "cableado",
    # "Lista Acceso-Alarma PrCJDG.pdf":            "seguridad",
    "Lista EZVIZ Pr CJDG.pdf":                   "seguridad",
    "CATALOGO DE SERVIDORES NUEVOS PR CJDG.pdf": "servidores",
    "CATALOGO SERVIDORES RENOVADOS PR CJDG.pdf": "servidores",
    "CAT HUAWEI PrCJDG.pdf":                     "redes",
    "Lista GRANDSTREAM PrCJDG.pdf":              "comunicacion",
    "Lista MIKROTIK PrCJDG.pdf":                 "redes",
}

def ensure_dirs():
    os.makedirs(STATIC_DIR, exist_ok=True)
    for folder in ['cctv', 'redes', 'servidores', 'cableado', 'seguridad', 'comunicacion', 'tecnologia', 'general']:
        os.makedirs(os.path.join(STATIC_DIR, folder), exist_ok=True)

def find_all_pdfs(base_path: str):
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

def extract_and_map_images():
    db = SessionLocal()
    total_imgs = 0
    mapped = 0
    
    pdfs = find_all_pdfs(CATALOGS_BASE)
    print(f"Buscando imágenes en {len(pdfs)} PDFs...")
    
    for pdf_path in pdfs:
        filename = pdf_path.name
        pilar_id = CATALOG_MAP.get(filename, "general")
        
        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            print(f" Error abriendo {filename}: {e}")
            continue
            
        print(f"Analizando {filename} ({doc.page_count} páginas)...")
        
        for i in range(doc.page_count):
            page = doc[i]
            image_list = page.get_images(full=True)
            
            if not image_list:
                continue
                
            # Extraer las palabras para ubicar en Y (aproximación)
            words = page.get_text("words")  # [x0, y0, x1, y1, word, block_no, line_no, word_no]
            
            # Buscar productos del sistema que coincidan de alguna forma en texto
            # Pista: si el modelo o la marca está en esta página
            page_text = page.get_text("text").lower()
            
            possible_products = db.query(Service).filter(
                Service.pilar_id == pilar_id,
                Service.image_url == None
            ).all()
            
            # Filtrar productos que parezca que están en esta página (por nombre o codigo)
            products_in_page = []
            for sp in possible_products:
                if sp.codigo_modelo and sp.codigo_modelo.lower() in page_text:
                    products_in_page.append(sp)
                elif sp.nombre and sp.nombre[:15].lower() in page_text:
                    products_in_page.append(sp)
                    
            if not products_in_page:
                continue # No encontramos productos de nuestra db en esta página
                
            # Procesar imágenes
            image_bboxes = []
            for img_index, img in enumerate(image_list):
                xref = img[0]
                total_imgs += 1
                try:
                    base_image = doc.extract_image(xref)
                    image_bytes = base_image["image"]
                    image_ext = base_image["ext"]
                    
                    # Evitar imágenes minúsculas (iconos, logos repetitivos)
                    image = Image.open(io.BytesIO(image_bytes))
                    if image.width < 100 or image.height < 100:
                        continue
                        
                    # Guardar la imagen físicamente
                    img_filename = f"{filename.replace('.pdf','')}_p{i+1}_{img_index}.{image_ext}".replace(' ', '_')
                    save_path = os.path.join(STATIC_DIR, pilar_id, img_filename)
                    
                    # Solo guardar si es RGBA, convertir a RGB etc
                    if image.mode in ('RGBA', 'P'): 
                        image = image.convert('RGB')
                        
                    image.save(save_path)
                    public_url = f"/static/products/{pilar_id}/{img_filename}"
                    
                    # ¿Coordenadas de la imagen?
                    rects = page.get_image_rects(xref)
                    if rects:
                        center_y = (rects[0].y0 + rects[0].y1) / 2
                        image_bboxes.append((center_y, public_url))
                except Exception as e:
                    pass
            
            if not image_bboxes:
                continue
                
            # Asignar la imagen más cercana a cada producto de la página
            for prod in products_in_page:
                if prod.image_url: # Ya mapeado
                    continue
                    
                # Encontrar dónde está la palabra en la página (para ver su coordenada Y)
                prod_y = None
                search_term = (prod.codigo_modelo or prod.nombre[:15]).lower()
                
                for w in words:
                    if search_term in w[4].lower():
                        prod_y = (w[1] + w[3]) / 2  # y-center
                        break
                        
                if prod_y is not None:
                    # Encontrar la imagen más cercana
                    closest_image = min(image_bboxes, key=lambda x: abs(x[0] - prod_y))
                    prod.image_url = closest_image[1]
                    mapped += 1
                else:
                    # Fallback: asignarle la primera imagen grande (muchos catálogos tienen 1 producto por página)
                    prod.image_url = image_bboxes[0][1]
                    mapped += 1
                    
        db.commit()
    
    db.close()
    print(f"\n✅ Proceso completado.")
    print(f"   {total_imgs} imágenes detectadas.")
    print(f"   {mapped} imágenes asigadas a productos exitosamente.")

if __name__ == "__main__":
    ensure_dirs()
    extract_and_map_images()
