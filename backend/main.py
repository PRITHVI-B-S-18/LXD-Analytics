"""FastAPI application for Training Dashboard."""

import os
import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as api_router, sharepoint_connector, data_loader


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Auto-connect to SharePoint if configured
    if sharepoint_connector.is_configured:
        print("SharePoint credentials found. Auto-connecting...")
        try:
            result = sharepoint_connector.connect()
            if result.get("success"):
                print(f"SharePoint connected: {result.get('message')}")
                # Fetch initial data
                file_bytes = sharepoint_connector.fetch_file()
                filename = sharepoint_connector.file_name or "data.xlsx"
                if file_bytes:
                    data_loader.load_from_bytes(file_bytes, filename)
                    print("Initial data loaded from SharePoint")
                    # Start auto-refresh
                    sharepoint_connector.start_auto_refresh(
                        lambda data: data_loader.load_from_bytes(data, filename)
                    )
                    print("Auto-refresh enabled")
            else:
                print(f"SharePoint connection failed: {result.get('message')}")
        except Exception as e:
            print(f"SharePoint auto-connect error: {e}")
    else:
        print("SharePoint not configured. Waiting for file upload or manual connection.")
    
    yield
    
    # Shutdown: Stop auto-refresh
    if sharepoint_connector.is_connected:
        sharepoint_connector.stop_auto_refresh()
        print("SharePoint auto-refresh stopped")


app = FastAPI(
    title="LXD Analytics API",
    description="Backend API for the LXD Analytics application",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - allow frontend origins
allowed_origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Add production frontend URL if set
frontend_url = os.getenv("FRONTEND_URL")
if frontend_url:
    allowed_origins.append(frontend_url)

# In production on Render, allow all origins for the static site
# since they're on the same domain or use Render's internal routing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for flexibility
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Training Dashboard API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
