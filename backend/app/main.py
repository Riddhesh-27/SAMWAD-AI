"""
SAMVAD AI — Main FastAPI Application Server
Smart AI-based Multimodal Vision Assistant for Deaf and Speech-Impaired Communication
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import os

# Ensure backend directory is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from app.routes.recognition import router as recognition_router
from app.routes.grammar import router as grammar_router
from app.routes.health import router as health_router

app = FastAPI(
    title="SAMVAD AI API",
    description="Smart AI-based Multimodal Vision Assistant for Deaf and Speech-Impaired Communication",
    version="1.0.0"
)

# Enable CORS for Vite dev server (5173), Capacitor (localhost / capacitor://), and local network devices
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health_router)
app.include_router(recognition_router)
app.include_router(grammar_router)


@app.get("/")
async def root():
    return {
        "project": "SAMVAD AI",
        "description": "Smart AI-based Multimodal Vision Assistant for Deaf and Speech-Impaired Communication",
        "status": "online",
        "docs_url": "/docs",
        "api_health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
