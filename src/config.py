"""Configuration settings for the Training Dashboard."""

from dataclasses import dataclass
from typing import List


@dataclass
class Config:
    """Dashboard configuration settings."""
    
    # File paths
    DEFAULT_DATA_PATH: str = "data/training_data.xlsx"
    
    # Sheet names in Excel (supports partial matching)
    TRAINER_SHEET: str = "Trainer Data"
    ALLOTMENT_SHEET: str = "Allotment Data"
    
    # Header row positions (0-indexed)
    TRAINER_HEADER_ROW: int = 0  # Row 1 in Excel
    ALLOTMENT_HEADER_ROW: int = 1  # Row 2 in Excel (row 1 has day names)
    
    # Column mappings for Trainer Data
    TRAINER_COLUMNS = {
        "id": "pt",
        "type": "Trainer Type",
        "name": "Trainer Name",
        "email": "Trainer Email",
        "phone": "Trainer Phone",
        "vendor_name": "Vendor Name",
        "vendor_code": "Vendor Code",
        "vendor_email": "Vendor Email",
        "vendor_phone": "Vendor Phone",
    }
    
    # Column mappings for Allotment Data (wide format)
    ALLOTMENT_COLUMNS = {
        "delivery_id": "Delivery ID",
        "status": "Status",
        "campus": "Campus",
        "course_name": "Course Name",
        "start_date": "Start Date",
        "end_date": "End Date",
        "comments": "Comments",
        "batch": "Batch",
    }
    
    # Column mappings for Datapoint/Calculation sheet (long format - pre-transformed)
    DATAPOINT_COLUMNS = {
        "delivery_id": "Delivery ID",
        "status": "Status", 
        "client": "Client",  # Same as Campus
        "course": "Course",  # Same as Course Name
        "start_date": "Start Date",
        "end_date": "End Date",
        "batch": "Batch",
        "date": "Date",
        "trainer": "Trainer",
        "trainer_type": "Trainer Type",
    }
    
    # Sheet name for Datapoint (long format data)
    DATAPOINT_SHEET: str = "Datapoint"
    CALCULATION_SHEET: str = "Calculation"
    
    # Status values
    STATUS_COMPLETED: str = "Completed"
    STATUS_ONGOING: str = "Ongoing"
    STATUS_UPCOMING: str = "Upcoming"
    
    # Trainer types
    TRAINER_TYPES: List[str] = None
    
    # Values to filter out from allocation (non-assigned statuses)
    EXCLUDE_VALUES: List[str] = None
    
    def __post_init__(self):
        if self.EXCLUDE_VALUES is None:
            self.EXCLUDE_VALUES = [
                "Not yet started",
                "Training completed",
                "No Class",
                "Not allotted",
                "NA",
                "",
            ]
        
        if self.TRAINER_TYPES is None:
            self.TRAINER_TYPES = [
                "Internal-WILP",
                "Freelancer-Direct",
                "Freelancer-Vendor",
                "Internal",
                "Internal-Fulltime",
                "Internal-Others",
            ]
    
    # Dashboard styling
    PAGE_TITLE: str = "Training Dashboard"
    PAGE_ICON: str = "📊"
    LAYOUT: str = "wide"
    
    # Color scheme for charts
    COLOR_COMPLETED: str = "#28a745"
    COLOR_ONGOING: str = "#ffc107"
    COLOR_UPCOMING: str = "#17a2b8"
    COLOR_PRIMARY: str = "#0d6efd"
    COLOR_DANGER: str = "#dc3545"
