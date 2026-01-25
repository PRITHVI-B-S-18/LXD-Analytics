"""Pydantic models for API requests and responses."""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date


class UploadResponse(BaseModel):
    success: bool
    filename: Optional[str] = None
    sheets_found: Optional[List[str]] = None
    sheets_loaded: Optional[List[str]] = None
    trainer_rows: Optional[int] = None
    allotment_rows: Optional[int] = None
    datapoint_rows: Optional[int] = None
    error: Optional[str] = None


class SharePointStatus(BaseModel):
    is_configured: bool = False
    is_connected: bool = False
    last_sync: Optional[str] = None
    last_error: Optional[str] = None
    auto_refresh_enabled: bool = False
    refresh_interval_seconds: int = 300
    site_url: Optional[str] = None
    file_name: Optional[str] = None


class StatusResponse(BaseModel):
    is_loaded: bool
    filename: Optional[str] = None
    trainer_rows: int = 0
    allotment_rows: int = 0
    datapoint_rows: int = 0
    sharepoint: Optional[SharePointStatus] = None


class DashboardMetrics(BaseModel):
    total_programs: int = 0
    ongoing: int = 0
    completed: int = 0
    upcoming: int = 0
    active_trainers: int = 0
    pending_allotments: int = 0


class ChartDataItem(BaseModel):
    name: str
    value: int


class DashboardResponse(BaseModel):
    metrics: DashboardMetrics
    status_distribution: List[ChartDataItem]
    client_distribution: List[ChartDataItem]


class FilterOptions(BaseModel):
    statuses: List[str] = []
    clients: List[str] = []
    courses: List[str] = []
    trainer_types: List[str] = []


class DateRangeParams(BaseModel):
    start_date: Optional[date] = None
    end_date: Optional[date] = None


class ProgramFilters(BaseModel):
    status: Optional[List[str]] = None
    client: Optional[List[str]] = None
