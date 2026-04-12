"""SC-ADMIN-02: Create service_catalog table

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-07

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Crear enum solo si no existe
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE pilarenum AS ENUM ('TECNOLOGIA', 'CLIMATIZACION', 'ENERGIA', 'CIVIL');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # Crear tabla con referencia al enum existente
    op.execute("""
        CREATE TABLE service_catalog (
            id SERIAL PRIMARY KEY,
            pilar pilarenum NOT NULL,
            nombre VARCHAR(200) NOT NULL,
            descripcion TEXT,
            precio_base NUMERIC(12, 2),
            precio_variable BOOLEAN DEFAULT true,
            activo BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
        CREATE INDEX ix_service_catalog_pilar ON service_catalog (pilar);
    """)

    # Seed: servicios del Brochure CJDG
    op.execute("""
        INSERT INTO service_catalog (pilar, nombre, descripcion, precio_variable, activo) VALUES
        ('TECNOLOGIA', 'Redes y Cableado Estructurado', 'Diseño e instalación de redes LAN/WAN con cableado estructurado certificado.', true, true),
        ('TECNOLOGIA', 'Seguridad Informática', 'Implementación de firewalls, VPN y sistemas de protección perimetral.', true, true),
        ('TECNOLOGIA', 'Infraestructura Digital', 'Montaje de data centers, racks, servidores y sistemas de almacenamiento.', true, true),
        ('TECNOLOGIA', 'Soluciones y Soporte Cloud', 'Migración a la nube, administración de servicios cloud y soporte técnico.', true, true),
        ('TECNOLOGIA', 'Instalación de CCTV', 'Sistemas de videovigilancia IP con cámaras de alta resolución y monitoreo remoto.', true, true),
        ('CLIMATIZACION', 'Aires Acondicionados', 'Instalación y mantenimiento de aires acondicionados residencial, comercial e industrial.', true, true),
        ('CLIMATIZACION', 'Climatización de Precisión', 'Sistemas de climatización para data centers, laboratorios y oficinas.', true, true),
        ('CLIMATIZACION', 'Ventilación Mecánica', 'Diseño e instalación de sistemas de ventilación mecánica.', true, true),
        ('CLIMATIZACION', 'Control de Calidad del Aire', 'Monitoreo y control de calidad del aire en espacios cerrados.', true, true),
        ('ENERGIA', 'Sistemas de Respaldo', 'Plantas eléctricas, UPS y bancos de baterías para respaldo energético.', true, true),
        ('ENERGIA', 'Energía Solar e Híbrida', 'Instalación de paneles solares y sistemas híbridos de generación.', true, true),
        ('ENERGIA', 'Mantenimiento Eléctrico', 'Mantenimiento preventivo y correctivo de instalaciones eléctricas.', true, true),
        ('ENERGIA', 'Tableros y Cableado Eléctrico', 'Diseño y montaje de tableros eléctricos y cableado de potencia.', true, true),
        ('CIVIL', 'Proyecto de Obra Nueva', 'Diseño y ejecución de proyectos de construcción desde cero.', true, true),
        ('CIVIL', 'Remodelaciones y Ampliaciones', 'Remodelación de espacios comerciales, residenciales e industriales.', true, true),
        ('CIVIL', 'Obras Civiles Menores y Mayores', 'Ejecución de obras civiles de diversa escala y complejidad.', true, true),
        ('CIVIL', 'Reforzamiento Estructural', 'Evaluación y reforzamiento de estructuras existentes.', true, true);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS service_catalog")
    op.execute("DROP TYPE IF EXISTS pilarenum")
