import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Response, status
from fastapi.middleware.cors import CORSMiddleware
from app.api.chat_router import router as chat_router
from app.api.dashboard_router import router as dashboard_router
from app.api.report_router import router as report_router
from app.api.schema_router import router as schema_router
from app.dashboard.queries import EXPECTED_TABLES
from app.db.database import execute_query, resolve_db_path

@asynccontextmanager
async def lifespan(app: FastAPI):
    yield

app = FastAPI(title="AI BI Assistant", lifespan=lifespan)

cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in cors_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router, prefix="/api", tags=["Chat"])
app.include_router(dashboard_router, prefix="/api", tags=["Dashboard"])
app.include_router(report_router, prefix="/api", tags=["Report"])
app.include_router(schema_router, prefix="/api", tags=["Schema"])

@app.get("/")
def read_root():
    return {"message": "AI BI Assistant backend running with Olist database."}

@app.get("/api/health")
def health_check(response: Response):
    db_path = resolve_db_path()
    if not os.path.exists(db_path):
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded", "database": False, "missingTables": list(EXPECTED_TABLES)}

    try:
        rows = execute_query("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = {r["name"] for r in rows if r.get("name")}
        missing = [t for t in EXPECTED_TABLES if t not in existing_tables]
        if missing:
            response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
            return {"status": "degraded", "database": False, "missingTables": missing}
    except Exception:
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return {"status": "degraded", "database": False, "missingTables": list(EXPECTED_TABLES)}

    return {"status": "ok", "database": True}
