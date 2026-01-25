"""API routes for the training dashboard."""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel
import pandas as pd

from api.models import (
    UploadResponse, StatusResponse, DashboardResponse, 
    DashboardMetrics, FilterOptions, ChartDataItem
)
from services.data_loader import DataLoader
from services.data_transformer import DataTransformer
from services.sharepoint_connector import sharepoint_connector

router = APIRouter()

# Global data loader instance (in production, use proper state management)
data_loader = DataLoader()
transformer = DataTransformer()


# SharePoint request models
class SharePointConfigRequest(BaseModel):
    site_url: Optional[str] = None
    file_name: Optional[str] = None
    refresh_interval: Optional[int] = None


def df_to_dict_list(df: pd.DataFrame) -> List[dict]:
    """Convert DataFrame to list of dicts, handling NaN, Inf and datetime."""
    import numpy as np
    import math
    
    if df is None or df.empty:
        return []
    
    # Convert datetime columns to string
    df = df.copy()
    for col in df.columns:
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            df[col] = df[col].dt.strftime('%Y-%m-%d').fillna('')
    
    # Replace NaN and Inf with None for JSON compliance
    df = df.replace([np.inf, -np.inf], None)
    df = df.where(pd.notnull(df), None)
    
    # Convert to records and clean any remaining non-JSON values
    records = df.to_dict(orient='records')
    
    # Final cleanup for any edge cases
    def clean_value(v):
        if v is None:
            return None
        if isinstance(v, float):
            if math.isnan(v) or math.isinf(v):
                return None
        return v
    
    return [
        {k: clean_value(v) for k, v in record.items()}
        for record in records
    ]


@router.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Upload an Excel file."""
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="Only Excel files are supported")
    
    contents = await file.read()
    result = data_loader.load_from_bytes(contents, file.filename)
    
    return UploadResponse(**result)


# ==================== SharePoint Connection Endpoints ====================

@router.get("/sharepoint/status")
async def get_sharepoint_status():
    """Get SharePoint connection status."""
    return sharepoint_connector.status


@router.post("/sharepoint/connect")
async def connect_sharepoint():
    """Connect to SharePoint and load the Excel file."""
    if not sharepoint_connector.is_configured:
        raise HTTPException(
            status_code=400, 
            detail="SharePoint is not configured. Check environment variables."
        )
    
    # Connect to SharePoint
    result = sharepoint_connector.connect()
    
    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("message"))
    
    # Fetch the file
    try:
        file_content = sharepoint_connector.fetch_file()
        
        if file_content:
            # Load the data
            filename = sharepoint_connector.file_name or "sharepoint_file.xlsx"
            load_result = data_loader.load_from_bytes(file_content, f"[SharePoint] {filename}")
            
            return {
                "success": True,
                "message": "Connected to SharePoint and loaded data successfully",
                "connection": result.get("details"),
                "data": {
                    "sheets_found": load_result.get("sheets_found"),
                    "sheets_loaded": load_result.get("sheets_loaded"),
                    "trainer_rows": load_result.get("trainer_rows"),
                    "allotment_rows": load_result.get("allotment_rows"),
                    "datapoint_rows": load_result.get("datapoint_rows"),
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch file: {str(e)}")
    
    return result


@router.post("/sharepoint/refresh")
async def refresh_sharepoint_data():
    """Manually refresh data from SharePoint."""
    if not sharepoint_connector.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to SharePoint")
    
    try:
        file_content = sharepoint_connector.fetch_file()
        
        if file_content:
            filename = sharepoint_connector.file_name or "sharepoint_file.xlsx"
            load_result = data_loader.load_from_bytes(file_content, f"[SharePoint] {filename}")
            
            return {
                "success": True,
                "message": "Data refreshed successfully",
                "last_sync": sharepoint_connector.status.get("last_sync"),
                "data": {
                    "trainer_rows": load_result.get("trainer_rows"),
                    "allotment_rows": load_result.get("allotment_rows"),
                    "datapoint_rows": load_result.get("datapoint_rows"),
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Refresh failed: {str(e)}")


@router.post("/sharepoint/disconnect")
async def disconnect_sharepoint():
    """Disconnect from SharePoint."""
    sharepoint_connector.disconnect()
    return {"success": True, "message": "Disconnected from SharePoint"}


@router.post("/sharepoint/auto-refresh/start")
async def start_auto_refresh():
    """Start automatic data refresh from SharePoint."""
    if not sharepoint_connector.is_connected:
        raise HTTPException(status_code=400, detail="Not connected to SharePoint")
    
    def on_data_refreshed(content: bytes):
        """Callback when new data is available."""
        try:
            filename = sharepoint_connector.file_name or "sharepoint_file.xlsx"
            data_loader.load_from_bytes(content, f"[SharePoint] {filename}")
            print(f"[SharePoint] Data auto-refreshed at {datetime.now()}")
        except Exception as e:
            print(f"[SharePoint] Auto-refresh load error: {e}")
    
    sharepoint_connector.start_auto_refresh(on_data_refreshed)
    
    return {
        "success": True, 
        "message": f"Auto-refresh started (interval: {sharepoint_connector.refresh_interval}s)"
    }


@router.post("/sharepoint/auto-refresh/stop")
async def stop_auto_refresh():
    """Stop automatic data refresh."""
    sharepoint_connector.stop_auto_refresh()
    return {"success": True, "message": "Auto-refresh stopped"}


@router.put("/sharepoint/config")
async def update_sharepoint_config(config: SharePointConfigRequest):
    """Update SharePoint configuration."""
    sharepoint_connector.update_config(
        site_url=config.site_url,
        file_name=config.file_name,
        refresh_interval=config.refresh_interval
    )
    
    return {
        "success": True,
        "message": "Configuration updated",
        "status": sharepoint_connector.status
    }


# ==================== End SharePoint Endpoints ====================


@router.get("/status", response_model=StatusResponse)
async def get_status():
    """Get current data loading status."""
    status = data_loader.get_status()
    
    # Include SharePoint status
    sp_status = sharepoint_connector.status
    status["sharepoint"] = {
        "is_configured": sp_status.get("is_configured", False),
        "is_connected": sp_status.get("is_connected", False),
        "last_sync": sp_status.get("last_sync"),
        "last_error": sp_status.get("last_error"),
        "auto_refresh_enabled": sp_status.get("auto_refresh_enabled", False),
        "refresh_interval_seconds": sp_status.get("refresh_interval_seconds", 300),
        "site_url": sp_status.get("site_url"),
        "file_name": sp_status.get("file_name"),
    }
    
    return StatusResponse(**status)


def get_datapoint():
    """Helper to get datapoint data, transforming from allotment if needed."""
    return transformer.ensure_datapoint_data(
        data_loader.datapoint_data,
        data_loader.allotment_data,
        data_loader.trainer_data
    )


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Get dashboard metrics and charts."""
    if not data_loader.is_loaded:
        return DashboardResponse(
            metrics=DashboardMetrics(),
            status_distribution=[],
            client_distribution=[]
        )
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    metrics = transformer.get_dashboard_metrics(
        data_loader.allotment_data,
        datapoint_df,
        data_loader.trainer_data,
        start_dt, end_dt
    )
    
    status_dist = transformer.get_status_distribution(
        datapoint_df,
        data_loader.allotment_data
    )
    
    client_dist = transformer.get_client_distribution(
        datapoint_df,
        data_loader.allotment_data
    )
    
    return DashboardResponse(
        metrics=DashboardMetrics(**metrics),
        status_distribution=[ChartDataItem(**item) for item in status_dist],
        client_distribution=[ChartDataItem(**item) for item in client_dist]
    )


@router.get("/pending-allotments")
async def get_pending_allotments(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Get pending allotments data."""
    if not data_loader.is_loaded:
        return {"data": [], "total": 0}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    df = transformer.get_pending_allotments(
        datapoint_df,
        start_dt, end_dt
    )
    
    data = df_to_dict_list(df)
    total = sum(item.get('Pending Allotments', 0) for item in data)
    
    return {"data": data, "total": total}


@router.get("/utilization/trainers")
async def get_utilization_trainers(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Get trainer utilization data."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    df = transformer.get_utilization_by_trainer(
        datapoint_df,
        start_dt, end_dt
    )
    
    return {"data": df_to_dict_list(df)}


@router.get("/utilization/clients")
async def get_utilization_clients(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Get client utilization data."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    df = transformer.get_utilization_by_client(
        datapoint_df,
        start_dt, end_dt
    )
    
    return {"data": df_to_dict_list(df)}


@router.get("/utilization/deliveries")
async def get_utilization_deliveries(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Get delivery utilization data."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    df = transformer.get_utilization_by_delivery(
        datapoint_df,
        start_dt, end_dt
    )
    
    return {"data": df_to_dict_list(df)}


@router.get("/programs")
async def get_programs(
    status: Optional[List[str]] = Query(None),
    client: Optional[List[str]] = Query(None)
):
    """Get programs list."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    df = transformer.get_programs(
        datapoint_df,
        data_loader.allotment_data,
        status, client
    )
    
    return {"data": df_to_dict_list(df)}


@router.get("/trainers")
async def get_trainers():
    """Get trainer directory."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    df = transformer.get_trainers(data_loader.trainer_data)
    return {"data": df_to_dict_list(df)}


@router.get("/datapoint")
async def get_datapoint_endpoint(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000)
):
    """Get raw datapoint data with server-side pagination."""
    if not data_loader.is_loaded:
        return {"data": [], "total": 0, "page": 1, "page_size": page_size, "total_pages": 0}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    # Get filtered data (without limit)
    filtered_df = transformer.get_datapoint_data(
        datapoint_df,
        start_dt, end_dt, limit=None
    )
    
    total = len(filtered_df) if filtered_df is not None and not filtered_df.empty else 0
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    paginated_df = filtered_df.iloc[offset:offset + page_size] if not filtered_df.empty else filtered_df
    
    return {
        "data": df_to_dict_list(paginated_df),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages
    }


@router.get("/filters", response_model=FilterOptions)
async def get_filters():
    """Get available filter options."""
    if not data_loader.is_loaded:
        return FilterOptions()
    
    # Get datapoint data (transformed from allotment if needed)
    datapoint_df = get_datapoint()
    
    options = transformer.get_filter_options(
        datapoint_df,
        data_loader.allotment_data,
        data_loader.trainer_data
    )
    
    return FilterOptions(**options)


@router.get("/raw-allotment")
async def get_raw_allotment(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=1000)
):
    """Get raw allotment data before transformation with server-side pagination."""
    if not data_loader.is_loaded or data_loader.allotment_data is None:
        return {
            "data": [],
            "total": 0,
            "page": 1,
            "page_size": page_size,
            "total_pages": 0,
            "columns": [],
            "has_datapoint_sheet": False
        }
    
    df = data_loader.allotment_data
    total = len(df)
    columns = df.columns.tolist()
    total_pages = (total + page_size - 1) // page_size if total > 0 else 0
    
    # Apply pagination
    offset = (page - 1) * page_size
    paginated_df = df.iloc[offset:offset + page_size]
    
    # Check if datapoint sheet exists
    has_datapoint = data_loader.datapoint_data is not None and not data_loader.datapoint_data.empty
    
    return {
        "data": df_to_dict_list(paginated_df),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "columns": [str(c) for c in columns],
        "has_datapoint_sheet": has_datapoint
    }


@router.get("/programs-list")
async def get_programs_list():
    """Get list of programs (Delivery ID + Course Name) for filters."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    datapoint_df = get_datapoint()
    programs = transformer.get_program_list(datapoint_df, data_loader.allotment_data)
    return {"data": programs}


@router.get("/trainer-types")
async def get_trainer_types():
    """Get trainer types from trainer data sheet."""
    if not data_loader.is_loaded or data_loader.trainer_data is None:
        return {"data": []}
    
    types = transformer.get_trainer_types_from_sheet(data_loader.trainer_data)
    return {"data": types}


@router.get("/utilization/by-program")
async def get_utilization_by_program(
    programs: Optional[List[str]] = Query(None, description="List of program IDs")
):
    """Get utilization stats by program (Delivery ID + Course Name)."""
    if not data_loader.is_loaded:
        return {"metrics": {}, "trainer_type_chart": [], "status_chart": [], "programs_summary": []}
    
    datapoint_df = get_datapoint()
    
    result = transformer.get_utilization_by_program(datapoint_df, programs)
    
    return result


@router.get("/utilization/by-client")
async def get_utilization_by_client_new(
    clients: Optional[List[str]] = Query(None, description="List of clients"),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None)
):
    """Get utilization stats by client with date filter."""
    if not data_loader.is_loaded:
        return {"metrics": {}, "trainer_type_chart": [], "status_chart": [], "clients_summary": []}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    datapoint_df = get_datapoint()
    
    result = transformer.get_utilization_by_client_detailed(
        datapoint_df,
        clients,
        start_dt,
        end_dt
    )
    
    return result


@router.get("/utilization/by-trainer")
async def get_utilization_by_trainer(
    target_date: Optional[date] = Query(None, description="Date to check allocations for (default: today)")
):
    """Get trainer utilization by category for a specific date."""
    if not data_loader.is_loaded:
        return {
            "date": None,
            "categories": [],
            "summary": {
                "total_trainers": 0,
                "total_allocated": 0,
                "total_available": 0,
                "allocation_rate": 0.0
            }
        }
    
    target_dt = datetime.combine(target_date, datetime.min.time()) if target_date else None
    
    datapoint_df = get_datapoint()
    
    result = transformer.get_utilization_by_trainer(
        datapoint_df,
        data_loader.trainer_data,
        target_dt
    )
    
    return result


@router.get("/utilization/by-date")
async def get_utilization_by_date(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    clients: Optional[List[str]] = Query(None),
    programs: Optional[List[str]] = Query(None)
):
    """Get utilization stats by date with filters."""
    if not data_loader.is_loaded:
        return {"metrics": {}, "trainer_type_chart": [], "status_chart": [], "daily_trend": []}
    
    start_dt = datetime.combine(start_date, datetime.min.time()) if start_date else None
    end_dt = datetime.combine(end_date, datetime.max.time()) if end_date else None
    
    datapoint_df = get_datapoint()
    
    result = transformer.get_utilization_by_date(
        datapoint_df,
        start_dt,
        end_dt,
        clients,
        programs
    )
    
    return result


@router.get("/clients-list")
async def get_clients_list():
    """Get list of clients for filters."""
    if not data_loader.is_loaded:
        return {"data": []}
    
    datapoint_df = get_datapoint()
    clients = transformer.get_client_list(datapoint_df, data_loader.allotment_data)
    return {"data": clients}


@router.get("/debug/trainer-data")
async def debug_trainer_data():
    """Debug endpoint to see trainer data structure."""
    if not data_loader.is_loaded or data_loader.trainer_data is None:
        return {"error": "No trainer data loaded", "columns": [], "sample": []}
    
    df = data_loader.trainer_data
    columns = df.columns.tolist()
    sample = df.head(5).to_dict(orient='records')
    
    return {
        "columns": columns,
        "total_rows": len(df),
        "sample": sample
    }


@router.get("/debug/datapoint-sample")
async def debug_datapoint_sample():
    """Debug endpoint to see transformed datapoint data."""
    if not data_loader.is_loaded:
        return {"error": "No data loaded", "columns": [], "sample": []}
    
    datapoint_df = get_datapoint()
    if datapoint_df is None or datapoint_df.empty:
        return {"error": "No datapoint data", "columns": [], "sample": []}
    
    columns = datapoint_df.columns.tolist()
    sample = df_to_dict_list(datapoint_df.head(10))
    
    return {
        "columns": columns,
        "total_rows": len(datapoint_df),
        "sample": sample
    }


@router.get("/debug/force-transform")
async def debug_force_transform():
    """Force transformation from Allotment Data, ignoring any existing Datapoint sheet."""
    if not data_loader.is_loaded or data_loader.allotment_data is None:
        return {"error": "No allotment data loaded"}
    
    # Force transform from allotment, ignoring existing datapoint sheet
    transformed = transformer.transform_allotment_to_datapoint(data_loader.allotment_data)
    
    if data_loader.trainer_data is not None:
        transformed = transformer.enrich_with_trainer_info(transformed, data_loader.trainer_data)
    
    return {
        "source": "Freshly transformed from Allotment Data",
        "rows": len(transformed),
        "columns": transformed.columns.tolist(),
        "excel_expected": 6139,
        "difference": len(transformed) - 6139,
        "note": "If rows match 6139, the issue was using existing Datapoint sheet",
        "existing_datapoint_rows": len(data_loader.datapoint_data) if data_loader.datapoint_data is not None and not data_loader.datapoint_data.empty else 0
    }


@router.get("/debug/transformation-stats")
async def debug_transformation_stats():
    """Get detailed transformation statistics to compare with Excel formula."""
    if not data_loader.is_loaded:
        return {"error": "No data loaded"}
    
    result = {
        "raw_allotment": {},
        "transformation": {},
        "comparison_with_excel": {},
        "data_source": "unknown"
    }
    
    # Check if existing Datapoint sheet is being used
    has_existing_datapoint = data_loader.datapoint_data is not None and not data_loader.datapoint_data.empty
    result["data_source"] = "Existing Datapoint/Calculation sheet" if has_existing_datapoint else "Transformed from Allotment Data"
    result["existing_datapoint_rows"] = len(data_loader.datapoint_data) if has_existing_datapoint else 0
    
    # Raw allotment stats
    if data_loader.allotment_data is not None and not data_loader.allotment_data.empty:
        raw_df = data_loader.allotment_data
        result["raw_allotment"] = {
            "total_rows": len(raw_df),
            "total_columns": len(raw_df.columns),
            "columns": raw_df.columns.tolist()[:20],  # First 20 columns
            "non_empty_rows": int((raw_df.iloc[:, 0].notna() & (raw_df.iloc[:, 0] != '')).sum()),
        }
        
        # Count date-like columns
        import re
        date_cols = []
        non_date_cols = []
        for i, col in enumerate(raw_df.columns):
            col_str = str(col).strip()
            is_date = (
                isinstance(col, pd.Timestamp) or 
                any(m in col_str for m in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']) or
                bool(re.match(r'^\d{4}-\d{2}-\d{2}', col_str))  # ISO date format
            )
            if is_date:
                date_cols.append((i, col_str[:30]))
            elif i >= 10 and 'unnamed' not in col_str.lower():  # After metadata columns, skip Unnamed
                non_date_cols.append((i, col_str[:30]))
        
        result["raw_allotment"]["date_columns_found"] = len(date_cols)
        result["raw_allotment"]["first_5_date_cols"] = date_cols[:5]
        result["raw_allotment"]["non_date_cols_after_10"] = non_date_cols[:10]
    
    # Transformed datapoint stats
    datapoint_df = get_datapoint()
    if datapoint_df is not None and not datapoint_df.empty:
        result["transformation"] = {
            "total_rows": len(datapoint_df),
            "columns": datapoint_df.columns.tolist(),
            "unique_delivery_ids": int(datapoint_df['Delivery ID'].nunique()) if 'Delivery ID' in datapoint_df.columns else 0,
        }
        
        # Count by trainer status
        if 'Trainer' in datapoint_df.columns:
            trainer_vals = datapoint_df['Trainer'].astype(str).str.strip().str.lower()
            result["transformation"]["trainer_value_counts"] = {
                "empty_or_pending": int(trainer_vals.isin(['', 'nan', 'na', 'none', 'not allotted', 'pending']).sum()),
                "assigned": int((~trainer_vals.isin(['', 'nan', 'na', 'none', 'not allotted', 'pending'])).sum()),
            }
    
    # Excel comparison
    result["comparison_with_excel"] = {
        "excel_expected_rows": 6139,
        "actual_rows": len(datapoint_df) if datapoint_df is not None else 0,
        "difference": 6139 - (len(datapoint_df) if datapoint_df is not None else 0),
        "note": "If difference > 0, we're filtering too aggressively or missing date columns"
    }
    
    # Detailed calculation check
    if data_loader.allotment_data is not None:
        raw_df = data_loader.allotment_data
        non_empty_rows = int((raw_df.iloc[:, 0].notna() & (raw_df.iloc[:, 0].astype(str).str.strip() != '')).sum())
        
        # Count actual date columns (every other from index 10)
        date_count = len([i for i in range(10, len(raw_df.columns), 2)])
        
        expected_melted = non_empty_rows * date_count
        
        result["calculation_breakdown"] = {
            "non_empty_rows": non_empty_rows,
            "date_columns_every_other": date_count,
            "expected_melted_before_filter": expected_melted,
            "actual_after_filter": len(datapoint_df) if datapoint_df is not None else 0,
            "rows_filtered_out": expected_melted - (len(datapoint_df) if datapoint_df is not None else 0),
            "excel_says_after_filter": 6139,
            "our_filter_vs_excel": (expected_melted - (len(datapoint_df) if datapoint_df is not None else 0)) - (expected_melted - 6139)
        }
    
    return result


@router.get("/debug/filter-analysis")
async def debug_filter_analysis():
    """Analyze what values are being filtered out during transformation."""
    if not data_loader.is_loaded or data_loader.allotment_data is None:
        return {"error": "No data loaded"}
    
    raw_df = data_loader.allotment_data
    
    # Get non-empty rows
    first_col = raw_df.columns[0]
    row_mask = raw_df[first_col].notna() & (raw_df[first_col].astype(str).str.strip() != '')
    filtered_rows = raw_df[row_mask]
    
    # Get date columns (every other from index 10)
    date_cols = [raw_df.columns[i] for i in range(10, len(raw_df.columns), 2)]
    
    # Collect all values from date columns
    all_values = []
    for col in date_cols:
        values = filtered_rows[col].astype(str).str.strip().tolist()
        all_values.extend(values)
    
    # Count each unique value
    from collections import Counter
    value_counts = Counter(all_values)
    
    # Categorize
    exclude_values = ["not yet started", "training completed", "no class"]
    
    excluded_count = 0
    kept_count = 0
    excluded_breakdown = {}
    kept_breakdown = {}
    
    for val, count in value_counts.items():
        val_lower = val.lower() if val else ''
        if val_lower in exclude_values:
            excluded_count += count
            excluded_breakdown[val] = count
        else:
            kept_count += count
            if len(kept_breakdown) < 20:  # Limit sample
                kept_breakdown[val[:50] if val else '(empty)'] = count
    
    return {
        "total_values": len(all_values),
        "date_columns": len(date_cols),
        "non_empty_rows": len(filtered_rows),
        "expected_total": len(date_cols) * len(filtered_rows),
        "excluded": {
            "total": excluded_count,
            "breakdown": excluded_breakdown
        },
        "kept": {
            "total": kept_count,
            "sample": dict(sorted(kept_breakdown.items(), key=lambda x: -x[1])[:15])
        },
        "excel_expected_kept": 6139,
        "our_kept": kept_count,
        "difference": kept_count - 6139
    }


@router.get("/debug/search-delivery")
async def debug_search_delivery(delivery_id: str = Query(..., description="Delivery ID to search for")):
    """Search for a specific Delivery ID in both raw and transformed data."""
    if not data_loader.is_loaded:
        return {"error": "No data loaded"}
    
    result = {
        "search_term": delivery_id,
        "in_raw_allotment": {"found": False, "count": 0, "sample": []},
        "in_transformed": {"found": False, "count": 0, "sample": []},
    }
    
    # Search in raw allotment data
    if data_loader.allotment_data is not None and not data_loader.allotment_data.empty:
        raw_df = data_loader.allotment_data
        delivery_col = 'Delivery ID' if 'Delivery ID' in raw_df.columns else None
        if delivery_col:
            matches = raw_df[raw_df[delivery_col].astype(str).str.contains(delivery_id, case=False, na=False)]
            result["in_raw_allotment"]["found"] = len(matches) > 0
            result["in_raw_allotment"]["count"] = len(matches)
            if not matches.empty:
                # Get first 15 columns for sample
                cols = matches.columns.tolist()[:15]
                result["in_raw_allotment"]["sample"] = matches[cols].head(5).to_dict(orient='records')
    
    # Search in transformed datapoint data
    datapoint_df = get_datapoint()
    if datapoint_df is not None and not datapoint_df.empty:
        delivery_col = 'Delivery ID' if 'Delivery ID' in datapoint_df.columns else None
        if delivery_col:
            matches = datapoint_df[datapoint_df[delivery_col].astype(str).str.contains(delivery_id, case=False, na=False)]
            result["in_transformed"]["found"] = len(matches) > 0
            result["in_transformed"]["count"] = len(matches)
            if not matches.empty:
                result["in_transformed"]["sample"] = df_to_dict_list(matches.head(5))
            
            # If not found, check why - get values from raw that were filtered
            if not result["in_transformed"]["found"] and result["in_raw_allotment"]["found"]:
                result["reason"] = "All trainer values for this Delivery ID were filtered out (Not yet started, Training completed, No Class)"
    
    return result


@router.get("/debug/data-verification")
async def debug_data_verification():
    """Comprehensive data verification endpoint."""
    if not data_loader.is_loaded:
        return {"error": "No data loaded"}
    
    datapoint_df = get_datapoint()
    
    result = {
        "sources": {
            "trainer_data_rows": len(data_loader.trainer_data) if data_loader.trainer_data is not None else 0,
            "allotment_data_rows": len(data_loader.allotment_data) if data_loader.allotment_data is not None else 0,
            "original_datapoint_rows": len(data_loader.datapoint_data) if data_loader.datapoint_data is not None else 0,
            "transformed_datapoint_rows": len(datapoint_df) if datapoint_df is not None else 0,
        },
        "datapoint_columns": datapoint_df.columns.tolist() if datapoint_df is not None else [],
        "metrics": {},
        "unique_values": {},
        "trainer_lookup_stats": {},
    }
    
    if datapoint_df is not None and not datapoint_df.empty:
        # Count total, pending, assigned
        trainer_col = 'Trainer' if 'Trainer' in datapoint_df.columns else None
        if trainer_col:
            pending_mask = (
                datapoint_df[trainer_col].isna() |
                (datapoint_df[trainer_col].astype(str).str.strip() == '') |
                (datapoint_df[trainer_col].astype(str).str.strip().str.lower().isin(['nan', 'na', 'none']))
            )
            result["metrics"] = {
                "total_rows": len(datapoint_df),
                "pending_rows": int(pending_mask.sum()),
                "assigned_rows": int((~pending_mask).sum()),
            }
        
        # Unique values per column
        for col in ['Client', 'Course', 'Delivery ID', 'Trainer Type', 'Status']:
            if col in datapoint_df.columns:
                unique_vals = datapoint_df[col].dropna().unique().tolist()
                result["unique_values"][col] = {
                    "count": len(unique_vals),
                    "sample": [str(v) for v in unique_vals[:10]]
                }
        
        # Trainer type distribution
        if 'Trainer Type' in datapoint_df.columns:
            type_counts = datapoint_df['Trainer Type'].value_counts(dropna=False).to_dict()
            result["trainer_type_distribution"] = {str(k) if pd.notna(k) else "Empty/NA": int(v) for k, v in type_counts.items()}
        
        # Check trainer lookup effectiveness
        if 'Trainer' in datapoint_df.columns and 'Trainer Code' in datapoint_df.columns:
            assigned_df = datapoint_df[~pending_mask] if trainer_col else datapoint_df
            trainers_with_code = (assigned_df['Trainer Code'].astype(str).str.strip() != '').sum()
            result["trainer_lookup_stats"] = {
                "assigned_trainers": len(assigned_df),
                "with_code": int(trainers_with_code),
                "without_code": int(len(assigned_df) - trainers_with_code),
            }
            if 'Trainer Type' in datapoint_df.columns:
                trainers_with_type = (assigned_df['Trainer Type'].astype(str).str.strip() != '').sum()
                result["trainer_lookup_stats"]["with_type"] = int(trainers_with_type)
                result["trainer_lookup_stats"]["without_type"] = int(len(assigned_df) - trainers_with_type)
    
    return result
