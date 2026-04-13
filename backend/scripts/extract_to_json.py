"""
Extrae datos de todos los PDFs de catalogos y genera catalog_data.json
Correr localmente: python scripts/extract_to_json.py
"""
import os
import re
import json
import pdfplumber

CATALOGS_BASE = os.path.join(os.path.dirname(__file__), "..", "..", "..", "Catalogos")
OUTPUT = os.path.join(os.path.dirname(__file__), "..", "catalog_data.json")

CATALOG_MAP = {
    "CAT CCTV PR CJDG.pdf":                      ("seguridad",    "Camaras CCTV",         "Hikvision"),
    "Cat UBIQUITI PrCJDG.pdf":                   ("redes",        "Redes Inalambricas",    "Ubiquiti"),
    "CATALOGO PC CLONES PrCJDG.pdf":             ("tecnologia",   "PCs y Equipos",         "Varios"),
    "Lista Precios 4-03-26 PrCJDG.pdf":          ("tecnologia",   "Lista de Precios",      "Varios"),
    "Lista SIEMON Pr CJDG.pdf":                  ("cableado",     "Cableado Estructurado", "Siemon"),
    "Lista Fibra Optica PrCJDG.pdf":             ("cableado",     "Fibra Optica",          "Varios"),
    "Lista Acceso-Alarma PrCJDG.pdf":            ("seguridad",    "Control de Acceso",     "Varios"),
    "Lista EZVIZ Pr CJDG.pdf":                   ("seguridad",    "Camaras IP",            "EZVIZ"),
    "CATALOGO DE SERVIDORES NUEVOS PR CJDG.pdf": ("servidores",   "Servidores Nuevos",     "Varios"),
    "CATALOGO SERVIDORES RENOVADOS PR CJDG.pdf": ("servidores",   "Servidores Renovados",  "Varios"),
    "CAT HUAWEI PrCJDG.pdf":                     ("redes",        "Equipos Huawei",        "Huawei"),
    "Lista GRANDSTREAM PrCJDG.pdf":              ("comunicacion", "VoIP / PBX",            "Grandstream"),
    "Lista MIKROTIK PrCJDG.pdf":                 ("redes",        "Routers y Switches",    "MikroTik"),
}

def slugify(text):
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    return text[:80]

def find_pdfs(base):
    pdfs = []
    for root, dirs, files in os.walk(base):
        for f in sorted(files):
            if f.lower().endswith('.pdf'):
                pdfs.append(os.path.join(root, f))
    return sorted(pdfs)

def extract_from_pdf(pdf_path, pilar_id, categoria, marca):
    products = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            for table in (page.extract_tables() or []):
                if not table or len(table) < 2:
                    continue
                headers = [str(h).strip().lower() if h else "" for h in table[0]]
                for row in table[1:]:
                    if not row or all(not c or str(c).strip() == '' for c in row):
                        continue
                    row_data = [str(c).strip() if c else "" for c in row]
                    nombre, codigo, precio = "", "", None
                    for i, hdr in enumerate(headers):
                        if i >= len(row_data) or not row_data[i]:
                            continue
                        val = row_data[i]
                        if any(k in hdr for k in ['descripci', 'nombre', 'producto', 'modelo', 'item', 'detalle', 'articulo']):
                            nombre = nombre or val
                        if any(k in hdr for k in ['codigo', 'código', 'code', 'cod', 'ref', 'p/n', 'part']):
                            codigo = codigo or val
                        if any(k in hdr for k in ['precio', 'price', '$', 'pvp', 'pvd', 'costo', 'valor']):
                            cleaned = re.sub(r'[^\d.,]', '', val)
                            if cleaned:
                                try:
                                    precio = float(cleaned.replace(',', '.'))
                                except:
                                    pass
                    if not nombre and row_data:
                        nombre = row_data[0]
                    if not codigo and len(row_data) > 1:
                        codigo = row_data[1]
                    if nombre and len(nombre) > 2:
                        products.append({
                            "nombre": nombre[:250].strip(),
                            "codigo_modelo": codigo[:100].strip() if codigo else None,
                            "precio": precio,
                        })
    return products

def main():
    all_pdfs = find_pdfs(CATALOGS_BASE)
    print(f"Encontrados {len(all_pdfs)} PDFs\n")

    all_products = []
    for pdf_path in all_pdfs:
        filename = os.path.basename(pdf_path)
        mapping = CATALOG_MAP.get(filename)
        if mapping:
            pilar_id, categoria, marca = mapping
        else:
            pilar_id = "general"
            categoria = filename.replace(".pdf", "").replace("Pr CJDG", "").strip()
            marca = "Varios"

        print(f"Procesando: {filename} [{pilar_id}/{categoria}]")
        try:
            products = extract_from_pdf(pdf_path, pilar_id, categoria, marca)
            print(f"  -> {len(products)} productos")

            for i, prod in enumerate(products):
                sid = f"{slugify(pilar_id + '-' + prod['nombre'])}-{i+1}"
                all_products.append({
                    "service_id": sid,
                    "pilar_id": pilar_id,
                    "nombre": prod["nombre"],
                    "categoria": categoria,
                    "marca": marca,
                    "codigo_modelo": prod["codigo_modelo"],
                    "precio": prod["precio"],
                })
        except Exception as e:
            print(f"  ERROR: {e}")

    # Guardar JSON
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(all_products, f, ensure_ascii=False, indent=2)

    print(f"\nTotal: {len(all_products)} productos guardados en catalog_data.json")

if __name__ == "__main__":
    main()
