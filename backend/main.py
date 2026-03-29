import os
import sys
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from dotenv import load_dotenv

load_dotenv()

import models
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Cognition MeetingOS",
    description="AI system that turns meetings into execution",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and register routes
from routes.meetings import router as meetings_router
from routes.tasks import router as tasks_router

app.include_router(meetings_router)
app.include_router(tasks_router)

@app.get("/")
def root():
    return {
        "app": os.getenv("APP_NAME"),
        "status": "running",
        "message": "MeetingOS backend is alive"
    }

@app.get("/health")
def health():
    return {"status": "ok"}