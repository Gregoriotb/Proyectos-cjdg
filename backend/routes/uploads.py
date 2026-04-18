"""
[CONTEXT: UPLOADS] - Uploads Router
Manejo de archivos e imágenes estáticas para la plataforma.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
import os
import secrets
import requests
import base64
from dependencies import get_current_admin

router = APIRouter()

# Obtiene la ruta del directorio "static/uploads" relativo a este archivo
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

# Asegurar que el directorio de subidas exista
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError:
    pass


# ============================================================
# FUNCIÓN REUTILIZABLE (usada por chat y otros módulos)
# ============================================================

async def upload_file_to_imgbb(file: UploadFile) -> dict:
    """
    Función pura para subir archivos a ImgBB o fallback local.
    NO requiere autenticación - puede ser usada por clientes y admins.
    Retorna: {"url": "https://...", "name": "archivo.jpg", "type": "image/jpeg"}
    """
    if not file.content_type:
        raise HTTPException(status_code=400, detail="No se pudo determinar el tipo de archivo.")
        
    contents = await file.read()
    
    # 1. INTENTAR IMGBB PRIMERO (si hay API key)
    imgbb_key = os.getenv("IMGBB_API_KEY")
    if imgbb_key:
        try:
            response = requests.post(
                "https://api.imgbb.com/1/upload",
                data={
                    "key": imgbb_key,
                    "image": base64.b64encode(contents),
                    "name": file.filename
                },
                timeout=30
            )
            if response.status_code == 200:
                data = response.json()
                return {
                    "url": data["data"]["url"],
                    "delete_url": data["data"].get("delete_url"),
                    "name": file.filename,
                    "type": file.content_type
                }
            else:
                print("ImgBB Upload Failed:", response.text)
                # Caer al fallback local
        except Exception as e:
            print(f"ImgBB Error: {e}")
            # Caer al fallback local

    # 2. FALLBACK LOCAL (solo si no hay ImgBB o falló)
    ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    safe_name = f"{secrets.token_hex(8)}.{ext}"
    file_path = os.path.join(UPLOAD_DIR, safe_name)
    
    with open(file_path, "wb") as f:
        f.write(contents)
        
    # En producción Railway, esto es efímero. Se recomienda IMGBB.
    return {
        "url": f"/static/uploads/{safe_name}",
        "name": file.filename,
        "type": file.content_type
    }


# ============================================================
# ENDPOINT EXISTENTE (para Admin - Panel de Catálogo)
# ============================================================

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    current_admin=Depends(get_current_admin)
):
    """
    Subir una imagen al servidor (Admin).
    Retorna la URL pública para consumirse vía getImageUrl del frontend.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen permitida.")
        
    try:
        result = await upload_file_to_imgbb(file)
        return {"url": result["url"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno subiendo archivo: {str(e)}")