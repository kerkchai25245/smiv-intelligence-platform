from fastapi import APIRouter

from app.api.routes import audit, auth, dashboard, health, imports, intelligence, patients

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(patients.router)
api_router.include_router(imports.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(intelligence.router)
