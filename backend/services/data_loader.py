"""Data loader service for Excel files."""

import pandas as pd
from typing import Optional, Tuple, Dict, Any
from datetime import datetime
import io


class DataLoader:
    """Load training data from Excel files."""
    
    def __init__(self):
        self._trainer_data: Optional[pd.DataFrame] = None
        self._allotment_data: Optional[pd.DataFrame] = None
        self._datapoint_data: Optional[pd.DataFrame] = None
        self._is_loaded: bool = False
        self._file_name: Optional[str] = None
    
    def load_from_bytes(self, file_bytes: bytes, filename: str) -> Dict[str, Any]:
        """Load data from uploaded file bytes.
        
        Args:
            file_bytes: Raw bytes of the Excel file.
            filename: Original filename.
            
        Returns:
            Dict with loading status and sheet info.
        """
        try:
            excel_file = pd.ExcelFile(io.BytesIO(file_bytes))
            sheet_names = excel_file.sheet_names
            
            # Find sheets by name patterns
            trainer_sheet = self._find_sheet(sheet_names, "Trainer Data")
            allotment_sheet = self._find_sheet(sheet_names, "Allotment Data")
            # NOTE: We intentionally skip loading pre-computed Datapoint/Calculation sheets
            # The system will always transform fresh data from Allotment Data
            # datapoint_sheet = self._find_sheet(sheet_names, "Datapoint") or self._find_sheet(sheet_names, "Calculation")
            
            loaded_sheets = []
            
            # Load trainer data
            if trainer_sheet:
                self._trainer_data = pd.read_excel(excel_file, sheet_name=trainer_sheet, header=0)
                self._clean_trainer_data()
                loaded_sheets.append(trainer_sheet)
            else:
                self._trainer_data = pd.DataFrame()
            
            # Load allotment data (header in row 2)
            if allotment_sheet:
                self._allotment_data = pd.read_excel(excel_file, sheet_name=allotment_sheet, header=1)
                self._clean_allotment_data()
                loaded_sheets.append(allotment_sheet)
            else:
                self._allotment_data = pd.DataFrame()
            
            # Skip pre-computed Datapoint sheet - always use fresh transformation
            # This ensures consistency and avoids stale pre-computed data
            self._datapoint_data = pd.DataFrame()
            
            self._is_loaded = True
            self._file_name = filename
            
            return {
                "success": True,
                "filename": filename,
                "sheets_found": sheet_names,
                "sheets_loaded": loaded_sheets,
                "trainer_rows": len(self._trainer_data) if self._trainer_data is not None else 0,
                "allotment_rows": len(self._allotment_data) if self._allotment_data is not None else 0,
                "datapoint_rows": len(self._datapoint_data) if self._datapoint_data is not None else 0,
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _find_sheet(self, sheet_names: list, target: str) -> Optional[str]:
        """Find a sheet by name pattern."""
        target_lower = target.lower()
        for name in sheet_names:
            if target_lower in name.lower():
                return name
        return None
    
    def _clean_trainer_data(self):
        """Clean trainer data."""
        if self._trainer_data is None or self._trainer_data.empty:
            return
        self._trainer_data = self._trainer_data.dropna(how='all')
        self._trainer_data.columns = [str(col).strip() for col in self._trainer_data.columns]
    
    def _clean_allotment_data(self):
        """Clean allotment data."""
        if self._allotment_data is None or self._allotment_data.empty:
            return
        self._allotment_data = self._allotment_data.dropna(how='all')
        self._allotment_data.columns = [
            str(col).strip() if not isinstance(col, datetime) else col
            for col in self._allotment_data.columns
        ]
    
    def _clean_datapoint_data(self):
        """Clean datapoint data."""
        if self._datapoint_data is None or self._datapoint_data.empty:
            return
        self._datapoint_data = self._datapoint_data.dropna(how='all')
        self._datapoint_data.columns = [str(col).strip() for col in self._datapoint_data.columns]
        
        # Convert Date column to datetime
        if 'Date' in self._datapoint_data.columns:
            self._datapoint_data['Date'] = pd.to_datetime(self._datapoint_data['Date'], errors='coerce')
        
        # Convert Start Date and End Date
        for col in ['Start Date', 'End Date']:
            if col in self._datapoint_data.columns:
                self._datapoint_data[col] = pd.to_datetime(self._datapoint_data[col], errors='coerce')
    
    @property
    def is_loaded(self) -> bool:
        return self._is_loaded
    
    @property
    def trainer_data(self) -> Optional[pd.DataFrame]:
        return self._trainer_data
    
    @property
    def allotment_data(self) -> Optional[pd.DataFrame]:
        return self._allotment_data
    
    @property
    def datapoint_data(self) -> Optional[pd.DataFrame]:
        return self._datapoint_data
    
    @property
    def file_name(self) -> Optional[str]:
        return self._file_name
    
    def get_status(self) -> Dict[str, Any]:
        """Get current data loading status."""
        return {
            "is_loaded": self._is_loaded,
            "filename": self._file_name,
            "trainer_rows": len(self._trainer_data) if self._trainer_data is not None and not self._trainer_data.empty else 0,
            "allotment_rows": len(self._allotment_data) if self._allotment_data is not None and not self._allotment_data.empty else 0,
            "datapoint_rows": len(self._datapoint_data) if self._datapoint_data is not None and not self._datapoint_data.empty else 0,
        }
