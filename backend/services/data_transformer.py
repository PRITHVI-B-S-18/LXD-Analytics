"""Data transformer service for processing training data."""

import pandas as pd
import numpy as np
from typing import Optional, List, Dict, Any
from datetime import datetime, date
import re


class DataTransformer:
    """Transform and analyze training data."""
    
    # Values to exclude from transformation (matching Excel Formula 1 exactly)
    # These are status values that indicate no active training session
    EXCLUDE_VALUES_TRANSFORM = [
        "Not yet started", "Training completed", "No Class"
    ]
    
    # Values that indicate empty/pending trainer assignments
    # These are KEPT during transformation as pending allotments
    EMPTY_TRAINER_VALUES = [
        "", "nan", "na", "none", "not allotted", "pending"
    ]
    
    def _is_trainer_empty(self, value) -> bool:
        """Check if a trainer value indicates empty/pending assignment."""
        if pd.isna(value):
            return True
        val_str = str(value).strip().lower()
        return val_str in self.EMPTY_TRAINER_VALUES
    
    def _get_pending_mask(self, df: pd.DataFrame, trainer_col: str = 'Trainer') -> pd.Series:
        """Get a boolean mask for rows with empty/pending trainer assignments."""
        if trainer_col not in df.columns:
            return pd.Series([False] * len(df), index=df.index)
        trainer_lower = df[trainer_col].astype(str).str.strip().str.lower()
        return df[trainer_col].isna() | trainer_lower.isin(self.EMPTY_TRAINER_VALUES)
    
    def transform_allotment_to_datapoint(self, allotment_df: pd.DataFrame) -> pd.DataFrame:
        """
        Transform Allotment Data (wide format) to Datapoint format (long format).
        
        This replicates Excel Formula 1:
        - Takes wide format data with dates as columns
        - Melts into long format with one row per date
        - Filters out "Not yet started", "Training completed", "No Class"
        
        Args:
            allotment_df: Raw Allotment Data DataFrame with dates as columns
            
        Returns:
            Transformed DataFrame in Datapoint format
        """
        if allotment_df is None or allotment_df.empty:
            return pd.DataFrame()
        
        df = allotment_df.copy()
        
        # Excel formula reference:
        # srcAll = A3:J1001 (first 10 columns are metadata)
        # K onwards are date columns, but Excel selects EVERY OTHER column:
        # dateCols = SEQUENCE(, INT((lastCol - COLUMN(K2) + 2) / 2), 1, 2) = {1, 3, 5, 7...}
        # This means: K, M, O, Q... (odd positions from K)
        
        # First, identify metadata columns (usually first 10, columns A-J)
        # Then, for remaining columns, select every other one
        
        metadata_cols = []
        date_cols = []
        
        # Known metadata column patterns (these are in columns A-J)
        metadata_patterns = [
            'Delivery ID', 'Status', 'Campus', 'Client', 'Course', 'Course Name',
            'Start Date', 'End Date', 'Comments', 'Batch', 'Vendor', 'Code', 'Order'
        ]
        
        all_cols = df.columns.tolist()
        
        # Strategy: Find where date columns start (first column that looks like a date or is after metadata)
        date_start_idx = None
        
        for i, col in enumerate(all_cols):
            col_str = str(col).strip()
            is_metadata = any(pattern.lower() in col_str.lower() for pattern in metadata_patterns)
            
            if not is_metadata:
                # Check if this looks like a date - handle multiple formats
                is_date = False
                
                # Check if it's a datetime object
                if isinstance(col, (datetime, pd.Timestamp)):
                    is_date = True
                # Check if column name looks like ISO date (2025-12-01 or 2025-12-01T00:00:00)
                elif re.match(r'^\d{4}-\d{2}-\d{2}', col_str):
                    is_date = True
                # Check for month abbreviations (1-Dec-25)
                elif self._is_date_column(col_str):
                    is_date = True
                # Skip "Unnamed:" columns
                elif 'unnamed' in col_str.lower():
                    continue
                
                if is_date:
                    date_start_idx = i
                    break
        
        # If we found where dates start, take first part as metadata
        if date_start_idx is not None:
            metadata_cols = all_cols[:date_start_idx]
            remaining_cols = all_cols[date_start_idx:]
            
            # Excel formula selects every OTHER column (1, 3, 5, 7...)
            # This means columns at index 0, 2, 4, 6... in the remaining columns
            date_cols = [remaining_cols[i] for i in range(0, len(remaining_cols), 2)]
            
            print(f"[DEBUG] Date columns start at index {date_start_idx}")
            print(f"[DEBUG] Total remaining columns: {len(remaining_cols)}")
            print(f"[DEBUG] Date columns selected (every other): {len(date_cols)}")
            print(f"[DEBUG] First 5 date columns: {[str(c)[:20] for c in date_cols[:5]]}")
            print(f"[DEBUG] Last 5 date columns: {[str(c)[:20] for c in date_cols[-5:]]}")
        else:
            # Fallback: use original logic
            for col in all_cols:
                col_str = str(col).strip()
                is_metadata = any(pattern.lower() in col_str.lower() for pattern in metadata_patterns)
                
                if not is_metadata:
                    if isinstance(col, datetime) or self._is_date_column(col_str):
                        date_cols.append(col)
                    else:
                        metadata_cols.append(col)
                else:
                    metadata_cols.append(col)
        
        if not date_cols:
            # No date columns found, return empty
            print("[DEBUG] No date columns found!")
            return pd.DataFrame()
        
        # Select metadata columns to keep
        keep_cols = []
        col_mapping = {}
        
        for col in metadata_cols:
            col_str = str(col).strip()
            if 'Delivery ID' in col_str:
                keep_cols.append(col)
                col_mapping[col] = 'Delivery ID'
            elif col_str == 'Status':
                keep_cols.append(col)
                col_mapping[col] = 'Status'
            elif 'Campus' in col_str or col_str == 'Client':
                keep_cols.append(col)
                col_mapping[col] = 'Client'
            elif 'Course' in col_str:
                keep_cols.append(col)
                col_mapping[col] = 'Course'
            elif 'Start Date' in col_str:
                keep_cols.append(col)
                col_mapping[col] = 'Start Date'
            elif 'End Date' in col_str:
                keep_cols.append(col)
                col_mapping[col] = 'End Date'
            elif col_str == 'Batch':
                keep_cols.append(col)
                col_mapping[col] = 'Batch'
        
        if not keep_cols:
            keep_cols = metadata_cols[:7]  # Take first 7 columns as metadata
        
        # Excel formula: rowMask = 'Allotment Data'!A3:A1001<>""
        # Filter rows where first column (Delivery ID) is not empty
        first_col = df.columns[0]
        row_mask = df[first_col].notna() & (df[first_col].astype(str).str.strip() != '')
        df_filtered = df[row_mask]
        
        print(f"[DEBUG] Rows before row filter: {len(df)}, after: {len(df_filtered)}")
        print(f"[DEBUG] Number of date columns: {len(date_cols)}")
        print(f"[DEBUG] Expected melted rows: {len(df_filtered)} * {len(date_cols)} = {len(df_filtered) * len(date_cols)}")
        
        # Melt the DataFrame - convert date columns to rows
        melted = pd.melt(
            df_filtered,
            id_vars=keep_cols,
            value_vars=date_cols,
            var_name='Date',
            value_name='Trainer'
        )
        
        # Rename columns
        melted = melted.rename(columns=col_mapping)
        
        # Convert Date column to datetime
        melted['Date'] = pd.to_datetime(melted['Date'], errors='coerce')
        
        # Filter out ONLY the specific status values (matching Excel Formula 1)
        # Keep empty/pending values - these are pending allotments
        exclude_lower = [v.lower() for v in self.EXCLUDE_VALUES_TRANSFORM]
        
        def should_keep(val):
            if pd.isna(val):
                return True  # Keep NaN - these are pending allotments
            val_str = str(val).strip().lower()
            # Only filter out the specific status values from Excel formula
            if val_str in exclude_lower:
                return False
            # Keep everything else (including empty strings, NA, Not allotted - these are pending)
            return True
        
        filtered = melted[melted['Trainer'].apply(should_keep)]
        
        print(f"[DEBUG] transform_allotment_to_datapoint: Before filter={len(melted)}, After filter={len(filtered)}")
        print(f"[DEBUG] Rows filtered out: {len(melted) - len(filtered)}")
        
        # Debug: Show what values were filtered
        if len(melted) > len(filtered):
            filtered_out = melted[~melted['Trainer'].apply(should_keep)]
            if not filtered_out.empty:
                excluded_values = filtered_out['Trainer'].value_counts().to_dict()
                print(f"[DEBUG] All excluded values with counts: {excluded_values}")
                print(f"[DEBUG] Total excluded: {len(filtered_out)}")
        
        # Debug: Check if any specific delivery IDs are being filtered out
        if 'Delivery ID' in melted.columns:
            before_ids = set(melted['Delivery ID'].dropna().unique())
            after_ids = set(filtered['Delivery ID'].dropna().unique()) if not filtered.empty else set()
            lost_ids = before_ids - after_ids
            if lost_ids:
                print(f"[DEBUG] transform_allotment_to_datapoint: Delivery IDs lost during filter: {list(lost_ids)[:10]}")
        
        # Sort by Delivery ID and Date
        if 'Delivery ID' in filtered.columns and 'Date' in filtered.columns:
            filtered = filtered.sort_values(['Delivery ID', 'Date'])
        
        # Add placeholder columns for Trainer Code and Trainer Type
        # These will be populated by enrich_with_trainer_info
        if 'Trainer Code' not in filtered.columns:
            filtered['Trainer Code'] = ''
        if 'Trainer Type' not in filtered.columns:
            filtered['Trainer Type'] = ''
        
        return filtered.reset_index(drop=True)
    
    def enrich_with_trainer_info(
        self, 
        datapoint_df: pd.DataFrame, 
        trainer_df: pd.DataFrame
    ) -> pd.DataFrame:
        """
        Enrich datapoint data with Trainer Code and Trainer Type from Trainer Data.
        
        This replicates the Excel formulas:
        - Trainer Code: =IFERROR(INDEX('Trainer Data Live'!A:A, MATCH(Trainer, 'Trainer Data Live'!C:C, 0)),"")
        - Trainer Type: =IFERROR(INDEX('Trainer Data Live'!B:B, MATCH(Trainer Code, 'Trainer Data Live'!A:A, 0)),"")
        
        Trainer Data columns expected:
        - Column A: pt (trainer code)
        - Column B: Trainer Type
        - Column C: Trainer Name
        """
        if datapoint_df is None or datapoint_df.empty:
            return datapoint_df
        
        df = datapoint_df.copy()
        
        if trainer_df is None or trainer_df.empty:
            df['Trainer Code'] = ''
            df['Trainer Type'] = ''
            return df
        
        # Find column names in trainer data
        # Based on Excel formula: A=pt(code), B=Trainer Type, C=Trainer Name
        code_col = None
        type_col = None
        name_col = None
        
        columns = trainer_df.columns.tolist()
        
        # Try exact matches first
        for col in columns:
            col_str = str(col).strip()
            col_lower = col_str.lower()
            
            # Look for trainer code column (usually 'pt' or first column)
            if col_lower == 'pt':
                code_col = col
            # Look for trainer type column
            elif col_lower == 'trainer type' or col_str == 'Trainer Type':
                type_col = col
            # Look for trainer name column
            elif col_lower == 'trainer name' or col_str == 'Trainer Name':
                name_col = col
        
        # Fallback: partial matching if exact match not found
        if not code_col:
            for col in columns:
                col_lower = str(col).lower()
                if 'code' in col_lower or col_lower == 'pt':
                    code_col = col
                    break
        
        if not type_col:
            for col in columns:
                col_lower = str(col).lower()
                if 'type' in col_lower:
                    type_col = col
                    break
        
        if not name_col:
            for col in columns:
                col_lower = str(col).lower()
                if 'name' in col_lower:
                    name_col = col
                    break
        
        # Last fallback: use positional columns (A=0, B=1, C=2)
        if not code_col and len(columns) > 0:
            code_col = columns[0]  # Column A
        if not type_col and len(columns) > 1:
            type_col = columns[1]  # Column B
        if not name_col and len(columns) > 2:
            name_col = columns[2]  # Column C
        
        print(f"[DEBUG] Trainer columns found - code: {code_col}, type: {type_col}, name: {name_col}")
        
        # Create lookup dictionaries
        trainer_to_code = {}
        code_to_type = {}
        
        if name_col and code_col:
            for _, row in trainer_df.iterrows():
                trainer_name = str(row.get(name_col, '')).strip()
                trainer_code = str(row.get(code_col, '')).strip()
                if trainer_name and trainer_name.lower() not in ['nan', '', 'none']:
                    trainer_to_code[trainer_name] = trainer_code
        
        if code_col and type_col:
            for _, row in trainer_df.iterrows():
                trainer_code = str(row.get(code_col, '')).strip()
                trainer_type = str(row.get(type_col, '')).strip()
                if trainer_code and trainer_code.lower() not in ['nan', '', 'none']:
                    code_to_type[trainer_code] = trainer_type
        
        print(f"[DEBUG] Lookup sizes - trainer_to_code: {len(trainer_to_code)}, code_to_type: {len(code_to_type)}")
        
        # Apply lookups
        def get_trainer_code(trainer):
            if pd.isna(trainer) or str(trainer).strip().lower() in ['', 'nan', 'na', 'none']:
                return ''
            trainer_str = str(trainer).strip()
            result = trainer_to_code.get(trainer_str, '')
            return result
        
        def get_trainer_type(code):
            if pd.isna(code) or str(code).strip().lower() in ['', 'nan', 'na', 'none']:
                return ''
            code_str = str(code).strip()
            result = code_to_type.get(code_str, '')
            return result
        
        if 'Trainer' in df.columns:
            # Check if Trainer Type column exists and contains valid TYPE data (not codes)
            existing_type_col = 'Trainer Type' in df.columns
            has_valid_types = False
            
            if existing_type_col:
                # Check if values look like actual types vs codes
                # Codes typically start with letters+numbers like "neo10408"
                # Types are usually words like "Internal", "External", "Vendor"
                sample_values = df['Trainer Type'].dropna().astype(str).str.strip()
                sample_values = sample_values[sample_values != '']
                
                if len(sample_values) > 0:
                    # Check if values look like codes (contain numbers or are short alphanumeric)
                    sample = sample_values.head(10).tolist()
                    looks_like_codes = any(
                        any(c.isdigit() for c in str(v)) or 
                        (len(str(v)) < 15 and str(v).replace('-', '').replace('_', '').isalnum() and any(c.isdigit() for c in str(v)))
                        for v in sample if v and str(v).lower() not in ['', 'nan', 'na', 'none']
                    )
                    has_valid_types = not looks_like_codes
                    print(f"[DEBUG] Sample Trainer Type values: {sample[:5]}")
                    print(f"[DEBUG] Values look like codes: {looks_like_codes}")
            
            print(f"[DEBUG] Existing Trainer Type column: {existing_type_col}, has valid types: {has_valid_types}")
            
            # Always calculate Trainer Code from Trainer name
            df['Trainer Code'] = df['Trainer'].apply(get_trainer_code)
            
            # Recalculate Trainer Type from code if existing data looks like codes
            if not has_valid_types:
                df['Trainer Type'] = df['Trainer Code'].apply(get_trainer_type)
                
                # Count successes for debugging
                filled_codes = (df['Trainer Code'] != '').sum()
                filled_types = (df['Trainer Type'] != '').sum()
                print(f"[DEBUG] Enriched - codes filled: {filled_codes}, types filled: {filled_types}")
                
                # Sample some trainers for debugging
                trainers_sample = df['Trainer'].dropna().head(5).tolist()
                print(f"[DEBUG] Sample trainers: {trainers_sample}")
            else:
                print(f"[DEBUG] Using existing valid Trainer Type data from sheet")
        else:
            df['Trainer Code'] = ''
            df['Trainer Type'] = ''
        
        return df
    
    def _is_date_column(self, col_name: str) -> bool:
        """Check if a column name looks like a date."""
        if not col_name:
            return False
        
        col_str = str(col_name).strip()
        
        # Month abbreviations
        months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
        
        # Check for month abbreviation in column name
        for month in months:
            if month in col_str:
                return True
        
        # Check for date patterns
        date_patterns = [
            r'\d{1,2}[-/]\d{1,2}[-/]\d{2,4}',  # 1/1/2025, 01-01-25
            r'\d{4}[-/]\d{1,2}[-/]\d{1,2}',    # 2025-01-01
        ]
        
        for pattern in date_patterns:
            if re.search(pattern, col_str):
                return True
        
        return False
    
    def ensure_datapoint_data(
        self, 
        datapoint_df: pd.DataFrame, 
        allotment_df: pd.DataFrame,
        trainer_df: pd.DataFrame = None
    ) -> pd.DataFrame:
        """
        Ensure we have Datapoint format data with Trainer Code and Trainer Type.
        If Datapoint sheet exists, use it. Otherwise, transform Allotment Data.
        
        Args:
            datapoint_df: Pre-existing Datapoint DataFrame (may be empty)
            allotment_df: Raw Allotment Data DataFrame
            trainer_df: Trainer Data DataFrame for lookups
            
        Returns:
            DataFrame in Datapoint format with Trainer Code and Trainer Type
        """
        result = pd.DataFrame()
        
        # If we have datapoint data, use it
        if datapoint_df is not None and not datapoint_df.empty:
            result = datapoint_df.copy()
        # Otherwise, transform from allotment data
        elif allotment_df is not None and not allotment_df.empty:
            result = self.transform_allotment_to_datapoint(allotment_df)
        
        if result.empty:
            return result
        
        # Enrich with trainer info if trainer data available
        if trainer_df is not None and not trainer_df.empty:
            result = self.enrich_with_trainer_info(result, trainer_df)
        
        return result
    
    def get_dashboard_metrics(
        self, 
        allotment_df: pd.DataFrame,
        datapoint_df: pd.DataFrame,
        trainer_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get KPI metrics for dashboard."""
        
        metrics = {
            "total_programs": 0,
            "ongoing": 0,
            "completed": 0,
            "upcoming": 0,
            "active_trainers": 0,
            "pending_allotments": 0,
        }
        
        # Use datapoint if available, else allotment
        if datapoint_df is not None and not datapoint_df.empty:
            df = datapoint_df.copy()
            
            # Count unique programs
            if 'Delivery ID' in df.columns:
                unique_programs = df.drop_duplicates(subset=['Delivery ID'])
                metrics["total_programs"] = len(unique_programs)
                
                if 'Status' in unique_programs.columns:
                    status_counts = unique_programs['Status'].value_counts().to_dict()
                    metrics["ongoing"] = status_counts.get('Ongoing', 0)
                    metrics["completed"] = status_counts.get('Completed', 0)
                    metrics["upcoming"] = status_counts.get('Upcoming', 0)
            
            # Count active trainers
            trainer_col = 'Trainer' if 'Trainer' in df.columns else None
            if trainer_col:
                assigned = df[
                    df[trainer_col].notna() &
                    (~df[trainer_col].astype(str).str.strip().isin(['', 'nan', 'NA']))
                ]
                metrics["active_trainers"] = assigned[trainer_col].nunique()
            
            # Count pending allotments
            pending = self.get_pending_allotments(df, start_date, end_date)
            if not pending.empty and 'Pending Allotments' in pending.columns:
                metrics["pending_allotments"] = int(pending['Pending Allotments'].sum())
        
        elif allotment_df is not None and not allotment_df.empty:
            if 'Delivery ID' in allotment_df.columns:
                unique_programs = allotment_df.drop_duplicates(subset=['Delivery ID'])
                metrics["total_programs"] = len(unique_programs)
                
                if 'Status' in unique_programs.columns:
                    status_counts = unique_programs['Status'].value_counts().to_dict()
                    metrics["ongoing"] = status_counts.get('Ongoing', 0)
                    metrics["completed"] = status_counts.get('Completed', 0)
                    metrics["upcoming"] = status_counts.get('Upcoming', 0)
        
        return metrics
    
    def get_pending_allotments(
        self,
        datapoint_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get pending allotments from datapoint data."""
        
        if datapoint_df is None or datapoint_df.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Client', 'Batch', 'Pending Allotments'])
        
        df = datapoint_df.copy()
        
        # Find date column
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col and not pd.api.types.is_datetime64_any_dtype(df[date_col]):
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
        
        # Apply date filter
        if date_col:
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        # Filter for empty/pending trainers
        trainer_col = 'Trainer' if 'Trainer' in df.columns else None
        if trainer_col:
            # Check for all values that indicate no trainer assigned
            trainer_lower = df[trainer_col].astype(str).str.strip().str.lower()
            pending_mask = (
                df[trainer_col].isna() |
                trainer_lower.isin(self.EMPTY_TRAINER_VALUES)
            )
            pending = df[pending_mask]
        else:
            pending = df
        
        if pending.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Client', 'Batch', 'Pending Allotments'])
        
        # Find grouping columns
        group_cols = []
        for col in ['Delivery ID', 'Course', 'Client', 'Batch']:
            if col in pending.columns:
                group_cols.append(col)
        
        if not group_cols:
            return pd.DataFrame({'Pending Allotments': [len(pending)]})
        
        result = pending.groupby(group_cols, dropna=False).size().reset_index(name='Pending Allotments')
        result = result.sort_values('Pending Allotments', ascending=False)
        
        return result
    
    def get_utilization_by_trainer(
        self,
        datapoint_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get trainer utilization stats."""
        
        if datapoint_df is None or datapoint_df.empty:
            return pd.DataFrame(columns=['Trainer', 'Assignments', 'Unique Programs', 'Unique Clients'])
        
        df = datapoint_df.copy()
        
        # Filter by date
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col:
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        trainer_col = 'Trainer' if 'Trainer' in df.columns else None
        if not trainer_col:
            return pd.DataFrame(columns=['Trainer', 'Assignments', 'Unique Programs', 'Unique Clients'])
        
        # Filter assigned only
        assigned = df[
            df[trainer_col].notna() &
            (~df[trainer_col].astype(str).str.strip().isin(['', 'nan', 'NA']))
        ]
        
        if assigned.empty:
            return pd.DataFrame(columns=['Trainer', 'Assignments', 'Unique Programs', 'Unique Clients'])
        
        # Group by trainer
        result = assigned.groupby(trainer_col).agg({
            'Date': 'count' if 'Date' in assigned.columns else 'size',
        }).reset_index()
        result.columns = ['Trainer', 'Assignments']
        
        # Add unique programs
        if 'Delivery ID' in assigned.columns:
            programs = assigned.groupby(trainer_col)['Delivery ID'].nunique().reset_index()
            programs.columns = ['Trainer', 'Unique Programs']
            result = result.merge(programs, on='Trainer', how='left')
        else:
            result['Unique Programs'] = 0
        
        # Add unique clients
        client_col = 'Client' if 'Client' in assigned.columns else ('Campus' if 'Campus' in assigned.columns else None)
        if client_col:
            clients = assigned.groupby(trainer_col)[client_col].nunique().reset_index()
            clients.columns = ['Trainer', 'Unique Clients']
            result = result.merge(clients, on='Trainer', how='left')
        else:
            result['Unique Clients'] = 0
        
        result = result.sort_values('Assignments', ascending=False)
        return result
    
    def get_utilization_by_client(
        self,
        datapoint_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get client/campus utilization stats."""
        
        if datapoint_df is None or datapoint_df.empty:
            return pd.DataFrame(columns=['Client', 'Total Sessions', 'Assigned', 'Pending', 'Programs'])
        
        df = datapoint_df.copy()
        
        # Filter by date
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col:
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
        if not client_col:
            return pd.DataFrame(columns=['Client', 'Total Sessions', 'Assigned', 'Pending', 'Programs'])
        
        trainer_col = 'Trainer' if 'Trainer' in df.columns else None
        
        results = []
        for client in df[client_col].dropna().unique():
            client_df = df[df[client_col] == client]
            total = len(client_df)
            
            if trainer_col:
                assigned = len(client_df[
                    client_df[trainer_col].notna() &
                    (~client_df[trainer_col].astype(str).str.strip().isin(['', 'nan', 'NA']))
                ])
                pending = total - assigned
            else:
                assigned = 0
                pending = total
            
            programs = client_df['Delivery ID'].nunique() if 'Delivery ID' in client_df.columns else 0
            
            results.append({
                'Client': client,
                'Total Sessions': total,
                'Assigned': assigned,
                'Pending': pending,
                'Programs': programs
            })
        
        result = pd.DataFrame(results)
        if not result.empty:
            result = result.sort_values('Total Sessions', ascending=False)
        return result
    
    def get_utilization_by_delivery(
        self,
        datapoint_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get delivery-wise utilization stats."""
        
        if datapoint_df is None or datapoint_df.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Client', 'Status', 'Total Sessions', 'Assigned', 'Pending'])
        
        df = datapoint_df.copy()
        
        # Filter by date
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col:
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        if 'Delivery ID' not in df.columns:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Client', 'Status', 'Total Sessions', 'Assigned', 'Pending'])
        
        trainer_col = 'Trainer' if 'Trainer' in df.columns else None
        client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
        course_col = 'Course' if 'Course' in df.columns else ('Course Name' if 'Course Name' in df.columns else None)
        
        results = []
        for delivery_id in df['Delivery ID'].dropna().unique():
            delivery_df = df[df['Delivery ID'] == delivery_id]
            first_row = delivery_df.iloc[0]
            
            total = len(delivery_df)
            if trainer_col:
                assigned = len(delivery_df[
                    delivery_df[trainer_col].notna() &
                    (~delivery_df[trainer_col].astype(str).str.strip().isin(['', 'nan', 'NA']))
                ])
                pending = total - assigned
            else:
                assigned = 0
                pending = total
            
            results.append({
                'Delivery ID': delivery_id,
                'Course': first_row.get(course_col, '') if course_col else '',
                'Client': first_row.get(client_col, '') if client_col else '',
                'Status': first_row.get('Status', ''),
                'Total Sessions': total,
                'Assigned': assigned,
                'Pending': pending
            })
        
        result = pd.DataFrame(results)
        if not result.empty:
            result = result.sort_values('Pending', ascending=False)
        return result
    
    def get_programs(
        self,
        datapoint_df: pd.DataFrame,
        allotment_df: pd.DataFrame,
        status_filter: Optional[List[str]] = None,
        client_filter: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Get programs list with stats."""
        
        # Prefer datapoint data
        if datapoint_df is not None and not datapoint_df.empty:
            df = datapoint_df.copy()
        elif allotment_df is not None and not allotment_df.empty:
            df = allotment_df.copy()
        else:
            return pd.DataFrame()
        
        if 'Delivery ID' not in df.columns:
            return pd.DataFrame()
        
        # Get unique programs
        group_cols = ['Delivery ID']
        agg_cols = {}
        
        for col in ['Status', 'Course', 'Course Name', 'Client', 'Campus', 'Start Date', 'End Date', 'Batch']:
            if col in df.columns:
                agg_cols[col] = 'first'
        
        if agg_cols:
            programs = df.groupby('Delivery ID').agg(agg_cols).reset_index()
        else:
            programs = df[['Delivery ID']].drop_duplicates()
        
        # Rename columns
        if 'Course Name' in programs.columns and 'Course' not in programs.columns:
            programs = programs.rename(columns={'Course Name': 'Course'})
        if 'Campus' in programs.columns and 'Client' not in programs.columns:
            programs = programs.rename(columns={'Campus': 'Client'})
        
        # Apply filters
        if status_filter and 'Status' in programs.columns:
            programs = programs[programs['Status'].isin(status_filter)]
        if client_filter and 'Client' in programs.columns:
            programs = programs[programs['Client'].isin(client_filter)]
        
        return programs
    
    def get_trainers(self, trainer_df: pd.DataFrame) -> pd.DataFrame:
        """Get trainer directory."""
        
        if trainer_df is None or trainer_df.empty:
            return pd.DataFrame()
        
        cols = ['pt', 'Trainer Type', 'Trainer Name', 'Trainer Email', 'Trainer Phone', 
                'Vendor Name', 'Vendor Code']
        available_cols = [c for c in cols if c in trainer_df.columns]
        
        if not available_cols:
            return trainer_df
        
        return trainer_df[available_cols].copy()
    
    def get_datapoint_data(
        self,
        datapoint_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: Optional[int] = 1000
    ) -> pd.DataFrame:
        """Get raw datapoint data with filters.
        
        Args:
            datapoint_df: Source DataFrame
            start_date: Optional start date filter
            end_date: Optional end date filter
            limit: Optional row limit. If None, returns all filtered rows (for pagination)
        
        Returns:
            Filtered DataFrame, optionally limited to N rows
        """
        
        if datapoint_df is None or datapoint_df.empty:
            return pd.DataFrame()
        
        df = datapoint_df.copy()
        
        # Filter by date
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col:
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        # Apply limit only if specified
        if limit is not None:
            return df.head(limit)
        return df
    
    def get_filter_options(
        self,
        datapoint_df: pd.DataFrame,
        allotment_df: pd.DataFrame,
        trainer_df: pd.DataFrame
    ) -> Dict[str, List[str]]:
        """Get available filter options."""
        
        options = {
            "statuses": [],
            "clients": [],
            "courses": [],
            "trainer_types": [],
        }
        
        df = datapoint_df if datapoint_df is not None and not datapoint_df.empty else allotment_df
        
        if df is not None and not df.empty:
            if 'Status' in df.columns:
                options["statuses"] = sorted([str(x) for x in df['Status'].dropna().unique()])
            
            client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
            if client_col:
                options["clients"] = sorted([str(x) for x in df[client_col].dropna().unique()])
            
            course_col = 'Course' if 'Course' in df.columns else ('Course Name' if 'Course Name' in df.columns else None)
            if course_col:
                options["courses"] = sorted([str(x) for x in df[course_col].dropna().unique()])
        
        if trainer_df is not None and not trainer_df.empty and 'Trainer Type' in trainer_df.columns:
            options["trainer_types"] = sorted([str(x) for x in trainer_df['Trainer Type'].dropna().unique()])
        
        return options
    
    def get_status_distribution(self, datapoint_df: pd.DataFrame, allotment_df: pd.DataFrame) -> List[Dict]:
        """Get status distribution for charts."""
        
        df = datapoint_df if datapoint_df is not None and not datapoint_df.empty else allotment_df
        
        if df is None or df.empty or 'Status' not in df.columns:
            return []
        
        if 'Delivery ID' in df.columns:
            df = df.drop_duplicates(subset=['Delivery ID'])
        
        counts = df['Status'].value_counts().to_dict()
        # Ensure names are strings
        return [{"name": str(k), "value": int(v)} for k, v in counts.items() if pd.notna(k)]
    
    def get_client_distribution(self, datapoint_df: pd.DataFrame, allotment_df: pd.DataFrame) -> List[Dict]:
        """Get client distribution for charts."""
        
        df = datapoint_df if datapoint_df is not None and not datapoint_df.empty else allotment_df
        
        if df is None or df.empty:
            return []
        
        client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
        if not client_col:
            return []
        
        if 'Delivery ID' in df.columns:
            df = df.drop_duplicates(subset=['Delivery ID'])
        
        counts = df[client_col].value_counts().head(10).to_dict()
        # Ensure names are strings
        return [{"name": str(k), "value": int(v)} for k, v in counts.items() if pd.notna(k)]
    
    def get_program_list(self, datapoint_df: pd.DataFrame, allotment_df: pd.DataFrame) -> List[Dict]:
        """Get list of programs (Delivery ID + Course Name) for filters."""
        
        df = datapoint_df if datapoint_df is not None and not datapoint_df.empty else allotment_df
        
        if df is None or df.empty:
            return []
        
        if 'Delivery ID' not in df.columns:
            return []
        
        course_col = 'Course' if 'Course' in df.columns else ('Course Name' if 'Course Name' in df.columns else None)
        
        programs = df.drop_duplicates(subset=['Delivery ID'])
        
        result = []
        for _, row in programs.iterrows():
            delivery_id = str(row['Delivery ID'])
            course = str(row.get(course_col, '')) if course_col else ''
            label = f"{delivery_id} - {course}" if course else delivery_id
            result.append({
                "id": delivery_id,
                "course": course,
                "label": label
            })
        
        return sorted(result, key=lambda x: x['label'])
    
    def get_client_list(self, datapoint_df: pd.DataFrame, allotment_df: pd.DataFrame) -> List[str]:
        """Get list of unique clients."""
        
        df = datapoint_df if datapoint_df is not None and not datapoint_df.empty else allotment_df
        
        if df is None or df.empty:
            return []
        
        client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
        if not client_col:
            return []
        
        clients = df[client_col].dropna().unique().tolist()
        return sorted([str(c) for c in clients])
    
    def get_trainer_types_from_sheet(self, trainer_df: pd.DataFrame) -> List[Dict]:
        """Get trainer types from trainer data sheet with counts."""
        
        if trainer_df is None or trainer_df.empty:
            return []
        
        if 'Trainer Type' not in trainer_df.columns:
            return []
        
        counts = trainer_df['Trainer Type'].value_counts().to_dict()
        return [{"type": str(k), "count": int(v)} for k, v in counts.items() if pd.notna(k)]
    
    def _get_trainer_type_counts(self, df: pd.DataFrame) -> Dict[str, int]:
        """
        Get trainer type counts directly from the Trainer Type column in datapoint data.
        Counts instances (rows), not unique trainers.
        Includes 'Unknown' category for assigned trainers without a type.
        """
        if df is None or df.empty:
            print("[DEBUG] _get_trainer_type_counts: DataFrame is empty")
            return {}
        
        print(f"[DEBUG] _get_trainer_type_counts: Columns = {df.columns.tolist()}")
        
        # Filter for rows with assigned trainers using consistent helper
        pending_mask = self._get_pending_mask(df)
        assigned = df[~pending_mask]
        
        print(f"[DEBUG] _get_trainer_type_counts: Total assigned rows = {len(assigned)}")
        
        if assigned.empty:
            return {}
        
        if 'Trainer Type' not in assigned.columns:
            print("[DEBUG] _get_trainer_type_counts: No 'Trainer Type' column found, all assigned as Unknown")
            return {"Unknown": len(assigned)}
        
        # Check what's in the Trainer Type column
        type_values = assigned['Trainer Type'].value_counts(dropna=False)
        print(f"[DEBUG] _get_trainer_type_counts: Trainer Type values = {type_values.head(10).to_dict()}")
        
        # Count instances of each trainer type, with 'Unknown' for missing
        result = {}
        unknown_count = 0
        
        for idx, row in assigned.iterrows():
            trainer_type = row.get('Trainer Type', '')
            trainer_type_str = str(trainer_type).strip() if pd.notna(trainer_type) else ''
            
            if trainer_type_str == '' or trainer_type_str.lower() in self.EMPTY_TRAINER_VALUES:
                unknown_count += 1
            else:
                result[trainer_type_str] = result.get(trainer_type_str, 0) + 1
        
        # Only add Unknown if there are any
        if unknown_count > 0:
            result['Unknown'] = unknown_count
        
        print(f"[DEBUG] _get_trainer_type_counts: Result = {result}")
        return result
    
    def get_utilization_by_program(
        self,
        datapoint_df: pd.DataFrame,
        program_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get utilization stats by program with charts data."""
        
        result = {
            "metrics": {
                "total_allotments": 0,
                "pending_allotments": 0,
                "assigned_allotments": 0
            },
            "trainer_type_chart": [],
            "status_chart": [],
            "programs_summary": []
        }
        
        if datapoint_df is None or datapoint_df.empty:
            return result
        
        df = datapoint_df.copy()
        
        # Filter by programs if specified
        if program_ids and 'Delivery ID' in df.columns:
            df = df[df['Delivery ID'].astype(str).isin(program_ids)]
        
        if df.empty:
            return result
        
        # Calculate metrics
        total = len(df)
        
        # Calculate pending/assigned using consistent helper
        pending_mask = self._get_pending_mask(df)
        pending = int(pending_mask.sum())
        assigned = total - pending
        
        # Get trainer type counts from Trainer Type column
        trainer_types = self._get_trainer_type_counts(df)
        
        result["metrics"] = {
            "total_allotments": total,
            "pending_allotments": pending,
            "assigned_allotments": assigned
        }
        
        # Trainer type pie chart data
        result["trainer_type_chart"] = [
            {"name": k, "value": v} for k, v in trainer_types.items()
        ]
        
        # Allocation status chart (Assigned vs Pending)
        result["status_chart"] = [
            {"name": "Assigned", "value": assigned},
            {"name": "Pending", "value": pending}
        ]
        
        # Programs summary for selected programs
        if 'Delivery ID' in df.columns:
            programs_data = []
            for prog_id in df['Delivery ID'].unique():
                prog_df = df[df['Delivery ID'] == prog_id]
                prog_total = len(prog_df)
                prog_pending = int(self._get_pending_mask(prog_df).sum())
                
                course = prog_df['Course'].iloc[0] if 'Course' in prog_df.columns else ''
                
                programs_data.append({
                    "program": f"{prog_id} - {course}" if course else str(prog_id),
                    "total": prog_total,
                    "assigned": prog_total - prog_pending,
                    "pending": prog_pending
                })
            
            result["programs_summary"] = sorted(programs_data, key=lambda x: x['pending'], reverse=True)[:10]
        
        # Include filtered raw data for verification (limit to 100 rows)
        display_cols = ['Delivery ID', 'Client', 'Course', 'Date', 'Trainer', 'Trainer Type', 'Status']
        available_cols = [c for c in display_cols if c in df.columns]
        filtered_df = df[available_cols].head(100).copy()
        
        # Convert datetime columns to string
        for col in filtered_df.columns:
            if pd.api.types.is_datetime64_any_dtype(filtered_df[col]):
                filtered_df[col] = filtered_df[col].dt.strftime('%Y-%m-%d').fillna('')
        
        # Replace NaN with empty string for display
        filtered_df = filtered_df.fillna('')
        
        result["filtered_data"] = filtered_df.to_dict(orient='records')
        result["filtered_total"] = total
        
        return result
    
    def get_utilization_by_client_detailed(
        self,
        datapoint_df: pd.DataFrame,
        clients: Optional[List[str]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Get utilization stats by client with charts data."""
        
        result = {
            "metrics": {
                "total_allotments": 0,
                "pending_allotments": 0,
                "assigned_allotments": 0
            },
            "trainer_type_chart": [],
            "status_chart": [],
            "clients_summary": []
        }
        
        if datapoint_df is None or datapoint_df.empty:
            return result
        
        df = datapoint_df.copy()
        
        # Apply date filter
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col:
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        # Filter by clients if specified
        client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
        if clients and client_col:
            df = df[df[client_col].astype(str).isin(clients)]
        
        if df.empty:
            return result
        
        # Calculate metrics using consistent helper
        total = len(df)
        pending_mask = self._get_pending_mask(df)
        pending = int(pending_mask.sum())
        assigned = total - pending
        
        # Get trainer type counts from Trainer Type column
        trainer_types = self._get_trainer_type_counts(df)
        
        result["metrics"] = {
            "total_allotments": total,
            "pending_allotments": pending,
            "assigned_allotments": assigned
        }
        
        # Trainer type pie chart data
        result["trainer_type_chart"] = [
            {"name": k, "value": v} for k, v in trainer_types.items()
        ]
        
        # Allocation status chart (Assigned vs Pending)
        result["status_chart"] = [
            {"name": "Assigned", "value": assigned},
            {"name": "Pending", "value": pending}
        ]
        
        # Clients summary bar chart
        if client_col:
            clients_data = []
            for client in df[client_col].dropna().unique():
                client_df = df[df[client_col] == client]
                client_total = len(client_df)
                client_pending = int(self._get_pending_mask(client_df).sum())
                
                clients_data.append({
                    "name": str(client),
                    "total": client_total,
                    "assigned": client_total - client_pending,
                    "pending": client_pending
                })
            
            result["clients_summary"] = sorted(clients_data, key=lambda x: x['total'], reverse=True)[:10]
        
        # Include filtered raw data for verification (limit to 100 rows)
        display_cols = ['Delivery ID', 'Client', 'Course', 'Date', 'Trainer', 'Trainer Type', 'Status']
        available_cols = [c for c in display_cols if c in df.columns]
        filtered_df = df[available_cols].head(100).copy()
        
        # Convert datetime columns to string
        for col in filtered_df.columns:
            if pd.api.types.is_datetime64_any_dtype(filtered_df[col]):
                filtered_df[col] = filtered_df[col].dt.strftime('%Y-%m-%d').fillna('')
        
        # Replace NaN with empty string for display
        filtered_df = filtered_df.fillna('')
        
        result["filtered_data"] = filtered_df.to_dict(orient='records')
        result["filtered_total"] = total
        
        return result
    
    def get_utilization_by_date(
        self,
        datapoint_df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        clients: Optional[List[str]] = None,
        program_ids: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get utilization stats by date with charts data."""
        
        result = {
            "metrics": {
                "total_allotments": 0,
                "pending_allotments": 0,
                "assigned_allotments": 0
            },
            "trainer_type_chart": [],
            "status_chart": [],
            "daily_trend": []
        }
        
        if datapoint_df is None or datapoint_df.empty:
            return result
        
        df = datapoint_df.copy()
        
        # Apply date filter
        date_col = 'Date' if 'Date' in df.columns else None
        if date_col:
            if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            if start_date:
                df = df[df[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                df = df[df[date_col] <= pd.to_datetime(end_date)]
        
        # Filter by clients
        client_col = 'Client' if 'Client' in df.columns else ('Campus' if 'Campus' in df.columns else None)
        if clients and client_col:
            df = df[df[client_col].astype(str).isin(clients)]
        
        # Filter by programs
        if program_ids and 'Delivery ID' in df.columns:
            df = df[df['Delivery ID'].astype(str).isin(program_ids)]
        
        if df.empty:
            return result
        
        # Calculate metrics using consistent helper
        total = len(df)
        pending_mask = self._get_pending_mask(df)
        pending = int(pending_mask.sum())
        assigned = total - pending
        
        # Get trainer type counts from Trainer Type column
        trainer_types = self._get_trainer_type_counts(df)
        
        result["metrics"] = {
            "total_allotments": total,
            "pending_allotments": pending,
            "assigned_allotments": assigned
        }
        
        # Trainer type pie chart data
        result["trainer_type_chart"] = [
            {"name": k, "value": v} for k, v in trainer_types.items()
        ]
        
        # Allocation status chart (Assigned vs Pending)
        result["status_chart"] = [
            {"name": "Assigned", "value": assigned},
            {"name": "Pending", "value": pending}
        ]
        
        # Daily trend line chart
        if date_col and not df[date_col].isna().all():
            daily_data = []
            for dt in sorted(df[date_col].dropna().unique()):
                day_df = df[df[date_col] == dt]
                day_total = len(day_df)
                day_pending = int(self._get_pending_mask(day_df).sum())
                
                daily_data.append({
                    "date": pd.to_datetime(dt).strftime('%Y-%m-%d'),
                    "total": day_total,
                    "assigned": day_total - day_pending,
                    "pending": day_pending
                })
            
            result["daily_trend"] = daily_data[:30]  # Limit to 30 days
        
        # Include filtered raw data for verification (limit to 100 rows)
        display_cols = ['Delivery ID', 'Client', 'Course', 'Date', 'Trainer', 'Trainer Type', 'Status']
        available_cols = [c for c in display_cols if c in df.columns]
        filtered_df = df[available_cols].head(100).copy()
        
        # Convert datetime columns to string
        for col in filtered_df.columns:
            if pd.api.types.is_datetime64_any_dtype(filtered_df[col]):
                filtered_df[col] = filtered_df[col].dt.strftime('%Y-%m-%d').fillna('')
        
        # Replace NaN with empty string for display
        filtered_df = filtered_df.fillna('')
        
        result["filtered_data"] = filtered_df.to_dict(orient='records')
        result["filtered_total"] = total
        
        return result
    
    def get_utilization_by_trainer(
        self,
        datapoint_df: pd.DataFrame,
        trainer_df: pd.DataFrame,
        target_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get trainer utilization by category for a specific date.
        
        Shows:
        - Total trainers in each category (from trainer master data)
        - Allocated trainers on the selected date (from datapoint data)
        
        Args:
            datapoint_df: Transformed datapoint DataFrame
            trainer_df: Trainer master data DataFrame
            target_date: The date to check allocations for (default: today)
            
        Returns:
            Dictionary with category breakdown and metrics
        """
        from datetime import date as date_type
        
        result = {
            "date": None,
            "categories": [],
            "summary": {
                "total_trainers": 0,
                "total_allocated": 0,
                "total_available": 0,
                "allocation_rate": 0.0
            }
        }
        
        # Use today if no date provided
        if target_date is None:
            target_date = datetime.now()
        
        result["date"] = target_date.strftime('%Y-%m-%d')
        
        # Get trainer categories from trainer master data
        if trainer_df is None or trainer_df.empty:
            return result
        
        # Find the trainer type column
        type_col = None
        for col in trainer_df.columns:
            if 'trainer type' in str(col).lower():
                type_col = col
                break
        
        if type_col is None:
            return result
        
        # Find the trainer name/code column for counting
        name_col = None
        code_col = None
        for col in trainer_df.columns:
            col_lower = str(col).lower()
            if 'trainer name' in col_lower or col_lower == 'trainer':
                name_col = col
            elif col_lower == 'pt' or 'trainer code' in col_lower:
                code_col = col
        
        # Count trainers by category from master data
        trainer_counts = trainer_df.groupby(type_col).size().to_dict()
        
        # Get unique trainer identifier column (prefer code, fallback to name)
        trainer_id_col = code_col or name_col
        
        # Get allocated trainers for the target date from datapoint data
        allocated_by_category = {}
        allocated_trainers_by_category = {}
        
        if datapoint_df is not None and not datapoint_df.empty:
            df = datapoint_df.copy()
            
            # Filter to target date
            date_col = 'Date' if 'Date' in df.columns else None
            if date_col:
                if not pd.api.types.is_datetime64_any_dtype(df[date_col]):
                    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
                
                target_dt = pd.to_datetime(target_date).normalize()
                df = df[df[date_col].dt.normalize() == target_dt]
            
            # Get only assigned trainers (not pending)
            trainer_col = 'Trainer' if 'Trainer' in df.columns else None
            type_col_dp = 'Trainer Type' if 'Trainer Type' in df.columns else None
            
            if trainer_col:
                pending_mask = self._get_pending_mask(df, trainer_col)
                assigned_df = df[~pending_mask]
                
                # Count unique allocated trainers by type
                if type_col_dp and not assigned_df.empty:
                    for trainer_type, group in assigned_df.groupby(type_col_dp):
                        if trainer_type and str(trainer_type).strip():
                            type_str = str(trainer_type).strip()
                            unique_trainers = group[trainer_col].nunique()
                            allocated_by_category[type_str] = unique_trainers
                            # Store actual trainer names for this category
                            allocated_trainers_by_category[type_str] = group[trainer_col].unique().tolist()
        
        # Build category list with totals and allocated counts
        categories = []
        total_trainers = 0
        total_allocated = 0
        
        for category, count in trainer_counts.items():
            if category and str(category).strip() and str(category).lower() not in ['nan', 'none', '']:
                cat_name = str(category).strip()
                allocated = allocated_by_category.get(cat_name, 0)
                available = max(0, count - allocated)
                
                categories.append({
                    "category": cat_name,
                    "total_trainers": int(count),
                    "allocated": int(allocated),
                    "available": int(available),
                    "allocation_rate": round((allocated / count * 100) if count > 0 else 0, 1),
                    "allocated_trainers": allocated_trainers_by_category.get(cat_name, [])
                })
                
                total_trainers += count
                total_allocated += allocated
        
        # Sort by category name
        categories.sort(key=lambda x: x["category"])
        
        result["categories"] = categories
        result["summary"] = {
            "total_trainers": int(total_trainers),
            "total_allocated": int(total_allocated),
            "total_available": int(max(0, total_trainers - total_allocated)),
            "allocation_rate": round((total_allocated / total_trainers * 100) if total_trainers > 0 else 0, 1)
        }
        
        return result
