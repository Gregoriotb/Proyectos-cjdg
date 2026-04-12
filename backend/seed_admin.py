import sys
import os

# Asegurar que el path alcance los módulos
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import SessionLocal
from models.user import User, UserRoleEnum
from core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    
    # Credenciales maestras del usuario
    admin_email = "jgregoriotbaltar@gmail.com"
    admin_name = "gregoriotb"
    admin_password = "1745694gregorio"
    
    try:
        # Verificar si ya existe
        existing_user = db.query(User).filter(User.email == admin_email).first()
        if existing_user:
            print(f"El usuario {admin_email} ya existe. Asegurando rol de ADMIN...")
            existing_user.role = UserRoleEnum.ADMIN
            existing_user.hashed_password = get_password_hash(admin_password)
            existing_user.full_name = admin_name
            db.commit()
            print("Usuario actualizado exitosamente a ADMIN.")
            return

        # Crear nuevo
        print(f"Creando Super Administrador: {admin_email}...")
        admin_user = User(
            email=admin_email,
            full_name=admin_name,
            hashed_password=get_password_hash(admin_password),
            role=UserRoleEnum.ADMIN,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)
        
        print("¡Usuario ADMIN creado con éxito!")
        print("Puedes iniciar sesión en la plataforma con estas credenciales.")
        
    except Exception as e:
        print(f"Ocurrió un error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
