"""Data loader module for reading Excel files and SharePoint data."""

import pandas as pd
from pathlib import Path
from typing import Optional, Tuple, Dict, Any
from datetime import datetime
import re

from .config import Config


class DataLoader:
    """Load training data from Excel files or SharePoint."""
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize the data loader.
        
        Args:
            config: Configuration object. Uses default if not provided.
        """
        self.config = config or Config()
        self._trainer_data: Optional[pd.DataFrame] = None
        self._allotment_data: Optional[pd.DataFrame] = None
        self._datapoint_data: Optional[pd.DataFrame] = None  # Long format pre-transformed data
        self._date_columns: Optional[list] = None
    
    def load_from_excel(self, file_path: str) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """Load data from a local Excel file.
        
        Args:
            file_path: Path to the Excel file.
            
        Returns:
            Tuple of (trainer_data, allotment_data) DataFrames.
        """
        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"Excel file not found: {file_path}")
        
        # Read both sheets
        excel_file = pd.ExcelFile(file_path)
        
        # Get sheet names
        sheet_names = excel_file.sheet_names
        
        # Try to find the trainer and allotment sheets
        trainer_sheet = self._find_sheet(sheet_names, self.config.TRAINER_SHEET)
        allotment_sheet = self._find_sheet(sheet_names, self.config.ALLOTMENT_SHEET)
        
        # Load trainer data (header in row 1, 0-indexed: 0)
        if trainer_sheet:
            self._trainer_data = pd.read_excel(
                excel_file,
                sheet_name=trainer_sheet,
                header=self.config.TRAINER_HEADER_ROW
            )
            self._clean_trainer_data()
        
        # Load allotment data (header in row 2, 0-indexed: 1)
        if allotment_sheet:
            self._allotment_data = pd.read_excel(
                excel_file,
                sheet_name=allotment_sheet,
                header=self.config.ALLOTMENT_HEADER_ROW
            )
            self._clean_allotment_data()
        
        return self._trainer_data, self._allotment_data
    
    def load_from_uploaded_file(self, uploaded_file) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Load data from a Streamlit uploaded file.
        
        Args:
            uploaded_file: Streamlit UploadedFile object.
            
        Returns:
            Tuple of (trainer_data, allotment_data, datapoint_data) DataFrames.
        """
        excel_file = pd.ExcelFile(uploaded_file)
        sheet_names = excel_file.sheet_names
        
        # Try to find the sheets by name patterns
        trainer_sheet = self._find_sheet(sheet_names, self.config.TRAINER_SHEET)
        allotment_sheet = self._find_sheet(sheet_names, self.config.ALLOTMENT_SHEET)
        datapoint_sheet = self._find_sheet(sheet_names, self.config.DATAPOINT_SHEET)
        calculation_sheet = self._find_sheet(sheet_names, self.config.CALCULATION_SHEET)
        
        # Load trainer data (header in row 1)
        if trainer_sheet:
            self._trainer_data = pd.read_excel(
                excel_file,
                sheet_name=trainer_sheet,
                header=self.config.TRAINER_HEADER_ROW
            )
            self._clean_trainer_data()
        else:
            self._trainer_data = pd.DataFrame()
        
        # Load allotment data (header in row 2)
        if allotment_sheet:
            self._allotment_data = pd.read_excel(
                excel_file,
                sheet_name=allotment_sheet,
                header=self.config.ALLOTMENT_HEADER_ROW
            )
            self._clean_allotment_data()
        elif len(sheet_names) > 0:
            # Fallback: use first sheet with header detection
            self._allotment_data = pd.read_excel(
                excel_file,
                sheet_name=sheet_names[0],
                header=self.config.ALLOTMENT_HEADER_ROW
            )
            self._clean_allotment_data()
        else:
            self._allotment_data = pd.DataFrame()
        
        # Load datapoint/calculation data (pre-transformed long format)
        datapoint_to_load = datapoint_sheet or calculation_sheet
        if datapoint_to_load:
            self._datapoint_data = pd.read_excel(
                excel_file,
                sheet_name=datapoint_to_load,
                header=0  # Header in row 1
            )
            self._clean_datapoint_data()
        else:
            self._datapoint_data = pd.DataFrame()
        
        return self._trainer_data, self._allotment_data, self._datapoint_data
    
    def _clean_datapoint_data(self):
        """Clean and preprocess datapoint (long format) data."""
        if self._datapoint_data is None or self._datapoint_data.empty:
            return
        
        # Remove completely empty rows
        self._datapoint_data = self._datapoint_data.dropna(how='all')
        
        # Standardize column names
        self._datapoint_data.columns = [
            str(col).strip() if not isinstance(col, datetime) else col
            for col in self._datapoint_data.columns
        ]
        
        # Convert Date column to datetime if it exists
        if 'Date' in self._datapoint_data.columns:
            self._datapoint_data['Date'] = pd.to_datetime(
                self._datapoint_data['Date'], 
                errors='coerce'
            )
        
        # Convert Start Date and End Date
        for col in ['Start Date', 'End Date']:
            if col in self._datapoint_data.columns:
                self._datapoint_data[col] = pd.to_datetime(
                    self._datapoint_data[col],
                    errors='coerce'
                )
    
    @property
    def datapoint_data(self) -> Optional[pd.DataFrame]:
        """Get the loaded datapoint (long format) data."""
        return self._datapoint_data
    
    def _find_sheet(self, sheet_names: list, target: str) -> Optional[str]:
        """Find a sheet by name pattern.
        
        Args:
            sheet_names: List of available sheet names.
            target: Target sheet name to find.
            
        Returns:
            Matching sheet name or None.
        """
        target_lower = target.lower()
        for name in sheet_names:
            if target_lower in name.lower():
                return name
        return None
    
    def _clean_trainer_data(self):
        """Clean and preprocess trainer data."""
        if self._trainer_data is None or self._trainer_data.empty:
            return
        
        # Remove completely empty rows
        self._trainer_data = self._trainer_data.dropna(how='all')
        
        # Identify date columns (columns with date-like names or datetime values)
        self._identify_date_columns(self._trainer_data)
    
    def _clean_allotment_data(self):
        """Clean and preprocess allotment data."""
        if self._allotment_data is None or self._allotment_data.empty:
            return
        
        # Remove completely empty rows
        self._allotment_data = self._allotment_data.dropna(how='all')
        
        # Standardize column names - strip whitespace
        self._allotment_data.columns = [
            str(col).strip() if not isinstance(col, datetime) else col
            for col in self._allotment_data.columns
        ]
        
        # Identify date columns
        self._identify_date_columns(self._allotment_data)
    
    def _identify_date_columns(self, df: pd.DataFrame) -> list:
        """Identify columns that represent dates.
        
        Args:
            df: DataFrame to analyze.
            
        Returns:
            List of date column names.
        """
        date_cols = []
        date_pattern = re.compile(r'\d{1,2}[-/]\w{3}[-/]\d{2,4}|\d{4}[-/]\d{2}[-/]\d{2}')
        
        for col in df.columns:
            col_str = str(col)
            # Check if column name looks like a date
            if isinstance(col, datetime):
                date_cols.append(col)
            elif date_pattern.search(col_str):
                date_cols.append(col)
            elif any(month in col_str for month in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                                                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']):
                date_cols.append(col)
        
        self._date_columns = date_cols
        return date_cols
    
    def get_date_columns(self) -> list:
        """Get the list of identified date columns.
        
        Returns:
            List of date column names.
        """
        return self._date_columns or []
    
    def get_metadata_columns(self, df: pd.DataFrame) -> list:
        """Get non-date columns (metadata columns).
        
        Args:
            df: DataFrame to analyze.
            
        Returns:
            List of metadata column names.
        """
        date_cols = set(self.get_date_columns())
        return [col for col in df.columns if col not in date_cols]
    
    def get_sheet_names(self, file_path: str) -> list:
        """Get available sheet names from an Excel file.
        
        Args:
            file_path: Path to the Excel file.
            
        Returns:
            List of sheet names.
        """
        excel_file = pd.ExcelFile(file_path)
        return excel_file.sheet_names
    
    @property
    def trainer_data(self) -> Optional[pd.DataFrame]:
        """Get the loaded trainer data."""
        return self._trainer_data
    
    @property
    def allotment_data(self) -> Optional[pd.DataFrame]:
        """Get the loaded allotment data."""
        return self._allotment_data


def create_sample_data() -> Tuple[pd.DataFrame, pd.DataFrame]:
    """Create sample data for testing/demo purposes.
    
    Returns:
        Tuple of (trainer_data, allotment_data) DataFrames.
    """
    import numpy as np
    from datetime import timedelta
    
    # Generate dates for December 2025 to February 2026
    base_date = datetime(2025, 12, 1)
    dates = [base_date + timedelta(days=i) for i in range(90)]
    date_cols = [d.strftime('%-d-%b-%y') if d.day < 10 else d.strftime('%d-%b-%y') for d in dates]
    # Normalize format (some systems may use different format)
    date_cols = [d.replace('-', '-') for d in date_cols]
    
    # Sample trainer names (realistic)
    trainer_names = [
        'Manoj Kumar', 'Vineeth Kumar K', 'Ajinroch A', 'Manjiri', 'Mahadev Bhatt',
        'Kisholoy Roy', 'Aviraj Bhaliya', 'Surya K', 'Rajesh Shet', 'Vigneshwaran J',
        'Pathi Adarsh Kumar', 'Shubham Udayavir', 'Harish Manana', 'Sridhar Kokkula',
        'Puneeth', 'Prasad Surap', 'Yogeshwaran K', 'Bindhiya J', 'Sanjay Srivatsa'
    ]
    
    # Sample trainer data
    trainer_types = ['Internal-WILP', 'Freelancer-Direct', 'Freelancer-Vendor', 
                     'Internal', 'Internal-Fulltime', 'Internal-Others']
    trainers = []
    for i in range(60):
        trainer = {
            'pt': f'neo{10499 + i}',
            'Trainer Type': np.random.choice(trainer_types, p=[0.5, 0.15, 0.1, 0.1, 0.1, 0.05]),
            'Trainer Name': trainer_names[i % len(trainer_names)] if i < len(trainer_names) else f'Trainer {i+1}',
            'Trainer Email': f'trainer{i+1}@iamneo.ai',
            'Trainer Phone': f'{np.random.randint(6000000000, 9999999999)}',
            'Vendor Name': 'NA',
            'Vendor Code': 'NA',
            'Vendor Email': 'NA',
            'Vendor Phone': 'NA',
        }
        # Add date columns with allocation status
        for date_col in date_cols:
            status = np.random.choice(['Not allotted', 'NA', ''], p=[0.7, 0.2, 0.1])
            trainer[date_col] = status
        trainers.append(trainer)
    
    trainer_df = pd.DataFrame(trainers)
    
    # Sample allotment data
    campuses = ['SKCET', 'Parul', 'Hexaware', 'LTI-Mumbai', 'LTIM-Bhubaneswar', 
                'TI-Bhubaneswar', 'CMREC', 'SREC', 'RMK']
    courses = [
        'Frontend frameworks', 'JAVA FS', 'Mentor Connect - JAVA', 'Mentor Connect - C#',
        'Mentor Connect - Python', 'P1_Microsoft SC900', 'P1_Oracle_Java Development on Oracle',
        'Application Development - FDP', 'DSA using C (Online-FDP)', 
        'Oracle_JAVA Certification training', 'P2_Microsoft DP900',
        'P2_Oracle_Java Development on Oracle', 'MERN', 'Cloud AWS (JAVA +REACT+ AWS)'
    ]
    statuses = ['Completed', 'Ongoing', 'Upcoming']
    
    allotments = []
    delivery_id_counter = {}
    
    for i in range(120):
        campus = np.random.choice(campuses)
        status = np.random.choice(statuses, p=[0.25, 0.55, 0.2])
        course = np.random.choice(courses)
        
        # Generate delivery ID
        prefix = campus[:3].upper() if campus not in ['LTIM-Bhubaneswar', 'LTI-Mumbai', 'TI-Bhubaneswar'] else campus.split('-')[0]
        if prefix not in delivery_id_counter:
            delivery_id_counter[prefix] = 1
        delivery_id = f'{prefix}-{str(delivery_id_counter[prefix]).zfill(3)}'
        delivery_id_counter[prefix] += 1
        
        # Calculate start and end dates based on status
        if status == 'Completed':
            start_idx = np.random.randint(0, 30)
            end_idx = start_idx + np.random.randint(5, 20)
        elif status == 'Ongoing':
            start_idx = np.random.randint(0, 45)
            end_idx = start_idx + np.random.randint(20, 45)
        else:  # Upcoming
            start_idx = np.random.randint(50, 70)
            end_idx = start_idx + np.random.randint(10, 20)
        
        start_date = dates[min(start_idx, len(dates)-1)]
        end_date = dates[min(end_idx, len(dates)-1)]
        
        allotment = {
            'Delivery ID': delivery_id,
            'Status': status,
            'Campus': campus,
            'Course Name': course,
            'Start Date': start_date.strftime('%-d-%b-%y'),
            'End Date': end_date.strftime('%-d-%b-%y'),
            'Comments': 'NA',
            'Batch': f'Batch {np.random.randint(1, 4)}' if np.random.random() > 0.5 else 'NA',
        }
        
        # Add date columns with trainer assignments
        for j, date_col in enumerate(date_cols):
            current_date = dates[j]
            if status == 'Upcoming':
                allotment[date_col] = 'Not yet started'
            elif status == 'Completed':
                if current_date <= end_date:
                    allotment[date_col] = 'Training completed'
                else:
                    allotment[date_col] = 'Training completed'
            else:  # Ongoing
                if current_date < start_date:
                    allotment[date_col] = 'Not yet started'
                elif current_date > end_date:
                    allotment[date_col] = 'Training completed'
                else:
                    # Assign trainer or leave empty
                    val = np.random.choice(
                        ['', np.random.choice(trainer_names), 'No Class'],
                        p=[0.15, 0.75, 0.1]
                    )
                    allotment[date_col] = val
        allotments.append(allotment)
    
    allotment_df = pd.DataFrame(allotments)
    
    return trainer_df, allotment_df
