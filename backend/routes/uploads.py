"""
[CONTEXT: UPLOADS] - Uploads Router
Manejo de archivos e imágenes estáticas para la plataforma.
"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
import os
import secrets
import requests
from dependencies import get_current_admin

router = APIRouter()

# Obtiene la ruta del directorio "static/uploads" relativo a este archivo
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "static", "uploads")

# Asegurar que el directorio de subidas exista (puede fallar en contenedores no-root, no es critico si se usa ImgBB)
try:
    os.makedirs(UPLOAD_DIR, exist_ok=True)
except OSError:
    pass  # En producción con ImgBB no se necesita este directorio

@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile = File(...),
    current_admin=Depends(get_current_admin)
):
    """
    Subir una imagen al servidor.
    Retorna la URL relativa pública para consumirse vía getImageUrl del frontend.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="El archivo no es una imagen permitida.")
        
    try:
        contents = await file.read()
        
        # 1. OPTATIVA: Si el usuario configura IMGBB_API_KEY en Railway, se sube directo a la nube.
        imgbb_key = os.getenv("IMGBB_API_KEY")
        if imgbb_key:
            import base64
            # Subir a ImgBB
            response = requests.post(
                "https://api.imgbb.com/1/upload",
                data={
                    "key": imgbb_key,
                    "image": base64.b64encode(contents)
                }
            )
            if response.status_code == 200:
                data = response.json()
                return {"url": data["data"]["url"]}
            else:
                print("ImgBB Upload Failed:", response.text)
                # Si falla, cae al guardado local por defecto.

        # 2. LOCAL STORAGE DEFAULT: Guardar en el disco (Necesita un Volumen para no borrarse)
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        safe_name = f"{secrets.token_hex(8)}.{ext}"
        file_path = os.path.join(UPLOAD_DIR, safe_name)
        
        with open(file_path, "wb") as f:
            f.write(contents)
            
        return {"url": f"/static/uploads/{safe_name}"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error interno subiendo archivo: {str(e)}")
