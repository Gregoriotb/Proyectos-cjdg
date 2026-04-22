"""
[CONTEXT: USER_GATEWAY] — OAuth Client Registry
SC-AUTH-OAUTH: Cliente authlib configurado para Google.

Variables de entorno requeridas:
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- GOOGLE_REDIRECT_URI     (URL absoluta del callback, debe coincidir con Google Cloud)
- FRONTEND_URL            (URL a donde redirigir tras login exitoso)
"""
import os
from authlib.integrations.starlette_client import OAuth

oauth = OAuth()

oauth.register(
    name="google",
    client_id=os.getenv("GOOGLE_CLIENT_ID"),
    client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

GOOGLE_REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://www.proyectoscjdg.com")
