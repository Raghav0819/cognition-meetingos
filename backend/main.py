import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="Cognition MeetingOS",
    description="AI system that turns meetings into execution",
    version="2.0.0"
)

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

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
from routes.companies import router as companies_router

app.include_router(meetings_router)
app.include_router(tasks_router)
app.include_router(companies_router)

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