"""Data transformer module to replicate Excel formula logic."""

import pandas as pd
import numpy as np
from typing import Optional, List, Tuple, Dict, Any
from datetime import datetime, date

from .config import Config


class DataTransformer:
    """Transform training data and replicate Excel formula logic."""
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize the transformer.
        
        Args:
            config: Configuration object. Uses default if not provided.
        """
        self.config = config or Config()
    
    def get_date_columns(self, df: pd.DataFrame) -> List[str]:
        """Extract date columns from DataFrame.
        
        Args:
            df: Input DataFrame.
            
        Returns:
            List of column names that represent dates.
        """
        date_cols = []
        # Known non-date columns to skip
        skip_columns = {
            'Delivery ID', 'Status', 'Campus', 'Course Name', 'Start Date', 'End Date',
            'Comments', 'Batch', 'pt', 'Trainer Type', 'Trainer Name', 'Trainer Email',
            'Trainer Phone', 'Vendor Name', 'Vendor Code', 'Vendor Email', 'Vendor Phone'
        }
        
        for col in df.columns:
            if col in skip_columns:
                continue
            if isinstance(col, (datetime, date)):
                date_cols.append(col)
            elif isinstance(col, str):
                # Check for date patterns like '1-Dec-25', '01-Dec-25', '16-Dec-25'
                try:
                    # Try common date formats (including single-digit day)
                    for fmt in ['%d-%b-%y', '%-d-%b-%y', '%d-%b-%Y', '%Y-%m-%d', '%d/%m/%Y']:
                        try:
                            # Handle both '1-Dec-25' and '01-Dec-25'
                            test_col = col.strip()
                            datetime.strptime(test_col, fmt)
                            date_cols.append(col)
                            break
                        except ValueError:
                            continue
                except:
                    pass
                
                # Additional check: if column starts with a digit and contains month abbreviation
                if col not in date_cols:
                    months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                              'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    col_str = str(col).strip()
                    if any(month in col_str for month in months) and col_str[0].isdigit():
                        date_cols.append(col)
        
        return date_cols
    
    def get_metadata_columns(self, df: pd.DataFrame) -> List[str]:
        """Get non-date columns.
        
        Args:
            df: Input DataFrame.
            
        Returns:
            List of metadata column names.
        """
        date_cols = set(self.get_date_columns(df))
        return [col for col in df.columns if col not in date_cols]
    
    def melt_date_columns(
        self,
        df: pd.DataFrame,
        id_columns: Optional[List[str]] = None,
        value_name: str = 'trainer',
        date_name: str = 'date'
    ) -> pd.DataFrame:
        """Convert wide format (dates as columns) to long format.
        
        This replicates the Excel formula logic of unpivoting date columns.
        
        Args:
            df: Input DataFrame with dates as columns.
            id_columns: Columns to keep as identifiers. If None, auto-detect.
            value_name: Name for the value column.
            date_name: Name for the date column.
            
        Returns:
            Melted DataFrame in long format.
        """
        if df.empty:
            return df
        
        date_cols = self.get_date_columns(df)
        
        if id_columns is None:
            id_columns = self.get_metadata_columns(df)
        
        # Filter id_columns to only include columns that exist in df
        id_columns = [col for col in id_columns if col in df.columns]
        
        if not date_cols:
            return df
        
        # Melt the DataFrame
        melted = pd.melt(
            df,
            id_vars=id_columns,
            value_vars=date_cols,
            var_name=date_name,
            value_name=value_name
        )
        
        # Convert date column to datetime - try multiple formats
        def parse_date(date_str):
            if pd.isna(date_str):
                return pd.NaT
            date_str = str(date_str).strip()
            for fmt in ['%d-%b-%y', '%d-%b-%Y', '%-d-%b-%y', '%Y-%m-%d']:
                try:
                    return datetime.strptime(date_str, fmt)
                except ValueError:
                    continue
            # Try pandas default parsing as fallback
            try:
                return pd.to_datetime(date_str)
            except:
                return pd.NaT
        
        melted[date_name] = melted[date_name].apply(parse_date)
        
        return melted
    
    def transform_allotment_data(
        self,
        df: pd.DataFrame,
        exclude_values: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Transform allotment data replicating Excel Formula 1.
        
        This replicates the LET formula that:
        1. Melts date columns into rows
        2. Filters out specific status values
        3. Returns active allocations with trainer assignments
        
        Args:
            df: Raw allotment DataFrame.
            exclude_values: Values to filter out. Uses config defaults if None.
            
        Returns:
            Transformed DataFrame with active allocations.
        """
        if df.empty:
            return df
        
        if exclude_values is None:
            exclude_values = self.config.EXCLUDE_VALUES
        
        # Get metadata columns
        meta_cols = self.get_metadata_columns(df)
        
        # Melt date columns
        melted = self.melt_date_columns(
            df,
            id_columns=meta_cols,
            value_name='trainer',
            date_name='date'
        )
        
        if melted.empty:
            return melted
        
        # Filter out excluded values
        mask = ~melted['trainer'].isin(exclude_values)
        mask &= melted['trainer'].notna()
        mask &= melted['trainer'] != ''
        
        filtered = melted[mask].copy()
        
        # Sort by date
        if 'date' in filtered.columns:
            filtered = filtered.sort_values('date')
        
        return filtered.reset_index(drop=True)
    
    def get_unassigned_slots(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get unassigned training slots replicating Excel Formula 2.
        
        This replicates the LET formula that:
        1. Filters by date range where trainer is empty
        2. Groups by Delivery ID, Campus, Course
        3. Counts occurrences
        
        Args:
            df: Raw allotment DataFrame.
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            DataFrame with unassigned slot counts.
        """
        if df.empty:
            return df
        
        # Get metadata columns
        meta_cols = self.get_metadata_columns(df)
        
        # Melt date columns
        melted = self.melt_date_columns(
            df,
            id_columns=meta_cols,
            value_name='trainer',
            date_name='date'
        )
        
        if melted.empty:
            return melted
        
        # Filter for unassigned (empty trainer)
        unassigned_values = ['', 'NA', None, 'Not allotted']
        mask = (
            melted['trainer'].isna() |
            melted['trainer'].isin(unassigned_values) |
            (melted['trainer'].astype(str).str.strip() == '')
        )
        
        # Apply date range filter
        if start_date is not None and 'date' in melted.columns:
            mask &= melted['date'] >= pd.to_datetime(start_date)
        if end_date is not None and 'date' in melted.columns:
            mask &= melted['date'] <= pd.to_datetime(end_date)
        
        unassigned = melted[mask].copy()
        
        if unassigned.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Campus', 'Course Name', 'count'])
        
        # Group and count
        group_cols = []
        for col in ['Delivery ID', 'Campus', 'Course Name']:
            if col in unassigned.columns:
                group_cols.append(col)
        
        if not group_cols:
            # Fallback to first few metadata columns
            group_cols = meta_cols[:3] if len(meta_cols) >= 3 else meta_cols
        
        if group_cols:
            result = unassigned.groupby(group_cols).size().reset_index(name='count')
            result = result.sort_values('count', ascending=False)
        else:
            result = pd.DataFrame({'count': [len(unassigned)]})
        
        return result
    
    def get_program_status_summary(self, df: pd.DataFrame) -> pd.DataFrame:
        """Get summary of programs by status.
        
        Args:
            df: Allotment DataFrame.
            
        Returns:
            DataFrame with status counts.
        """
        if df.empty or 'Status' not in df.columns:
            return pd.DataFrame(columns=['Status', 'count'])
        
        # Get unique programs by Delivery ID
        if 'Delivery ID' in df.columns:
            unique_programs = df.drop_duplicates(subset=['Delivery ID'])
        else:
            unique_programs = df
        
        status_counts = unique_programs['Status'].value_counts().reset_index()
        status_counts.columns = ['Status', 'count']
        
        return status_counts
    
    def get_campus_summary(self, df: pd.DataFrame) -> pd.DataFrame:
        """Get summary of programs by campus/client.
        
        Args:
            df: Allotment DataFrame.
            
        Returns:
            DataFrame with campus counts.
        """
        # Find campus/client column
        campus_col = 'Campus' if 'Campus' in df.columns else ('Client' if 'Client' in df.columns else None)
        
        if df.empty or campus_col is None:
            return pd.DataFrame(columns=['Campus', 'count'])
        
        # Get unique programs by Delivery ID
        if 'Delivery ID' in df.columns:
            unique_programs = df.drop_duplicates(subset=['Delivery ID'])
        else:
            unique_programs = df
        
        campus_counts = unique_programs[campus_col].value_counts().reset_index()
        campus_counts.columns = ['Campus', 'count']
        
        return campus_counts
    
    def get_trainer_utilization(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Calculate trainer utilization (days assigned).
        
        Args:
            df: Transformed allotment DataFrame (melted format).
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            DataFrame with trainer utilization counts.
        """
        if df.empty:
            return pd.DataFrame(columns=['trainer', 'days_assigned'])
        
        # If not already melted, melt it
        if 'trainer' not in df.columns:
            df = self.transform_allotment_data(df)
        
        if df.empty:
            return pd.DataFrame(columns=['trainer', 'days_assigned'])
        
        # Apply date filter
        filtered = df.copy()
        if start_date is not None and 'date' in filtered.columns:
            filtered = filtered[filtered['date'] >= pd.to_datetime(start_date)]
        if end_date is not None and 'date' in filtered.columns:
            filtered = filtered[filtered['date'] <= pd.to_datetime(end_date)]
        
        # Count days per trainer
        trainer_counts = filtered.groupby('trainer').agg({
            'date': 'nunique'
        }).reset_index()
        trainer_counts.columns = ['trainer', 'days_assigned']
        trainer_counts = trainer_counts.sort_values('days_assigned', ascending=False)
        
        return trainer_counts
    
    def get_daily_allocation_summary(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get daily summary of allocations.
        
        Args:
            df: Allotment DataFrame.
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            DataFrame with daily allocation counts.
        """
        if df.empty:
            return pd.DataFrame(columns=['date', 'assigned', 'unassigned', 'total'])
        
        # Melt the data
        meta_cols = self.get_metadata_columns(df)
        melted = self.melt_date_columns(df, id_columns=meta_cols)
        
        if melted.empty:
            return pd.DataFrame(columns=['date', 'assigned', 'unassigned', 'total'])
        
        # Apply date filter
        if start_date is not None:
            melted = melted[melted['date'] >= pd.to_datetime(start_date)]
        if end_date is not None:
            melted = melted[melted['date'] <= pd.to_datetime(end_date)]
        
        # Define assigned vs unassigned
        exclude_values = self.config.EXCLUDE_VALUES + ['', None]
        
        def categorize(val):
            if pd.isna(val) or str(val).strip() == '' or val in exclude_values:
                return 'unassigned'
            return 'assigned'
        
        melted['allocation_status'] = melted['trainer'].apply(categorize)
        
        # Group by date
        daily = melted.groupby(['date', 'allocation_status']).size().unstack(fill_value=0)
        daily = daily.reset_index()
        
        if 'assigned' not in daily.columns:
            daily['assigned'] = 0
        if 'unassigned' not in daily.columns:
            daily['unassigned'] = 0
        
        daily['total'] = daily['assigned'] + daily['unassigned']
        
        return daily[['date', 'assigned', 'unassigned', 'total']]
    
    def get_course_summary(self, df: pd.DataFrame) -> pd.DataFrame:
        """Get summary of programs by course.
        
        Args:
            df: Allotment DataFrame.
            
        Returns:
            DataFrame with course counts.
        """
        # Find course column
        course_col = 'Course Name' if 'Course Name' in df.columns else ('Course' if 'Course' in df.columns else None)
        
        if df.empty or course_col is None:
            return pd.DataFrame(columns=['Course Name', 'count'])
        
        # Get unique programs by Delivery ID
        if 'Delivery ID' in df.columns:
            unique_programs = df.drop_duplicates(subset=['Delivery ID'])
        else:
            unique_programs = df
        
        course_counts = unique_programs[course_col].value_counts().reset_index()
        course_counts.columns = ['Course Name', 'count']
        
        return course_counts
    
    def filter_data(
        self,
        df: pd.DataFrame,
        status: Optional[List[str]] = None,
        campus: Optional[List[str]] = None,
        course: Optional[List[str]] = None,
        trainer_type: Optional[List[str]] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Apply multiple filters to the data.
        
        Args:
            df: Input DataFrame.
            status: List of statuses to include.
            campus: List of campuses to include.
            course: List of courses to include.
            trainer_type: List of trainer types to include.
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            Filtered DataFrame.
        """
        filtered = df.copy()
        
        if status and 'Status' in filtered.columns:
            filtered = filtered[filtered['Status'].isin(status)]
        
        # Campus or Client column
        campus_col = 'Campus' if 'Campus' in filtered.columns else ('Client' if 'Client' in filtered.columns else None)
        if campus and campus_col:
            filtered = filtered[filtered[campus_col].isin(campus)]
        
        # Course Name or Course column
        course_col = 'Course Name' if 'Course Name' in filtered.columns else ('Course' if 'Course' in filtered.columns else None)
        if course and course_col:
            filtered = filtered[filtered[course_col].isin(course)]
        
        if trainer_type and 'Trainer Type' in filtered.columns:
            filtered = filtered[filtered['Trainer Type'].isin(trainer_type)]
        
        # Date filtering - handle both 'date' and 'Date' columns
        date_col = 'date' if 'date' in filtered.columns else ('Date' if 'Date' in filtered.columns else None)
        if (start_date or end_date) and date_col:
            if start_date:
                filtered = filtered[filtered[date_col] >= pd.to_datetime(start_date)]
            if end_date:
                filtered = filtered[filtered[date_col] <= pd.to_datetime(end_date)]
        
        return filtered
    
    def get_allocation_heatmap_data(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Prepare data for allocation heatmap.
        
        Args:
            df: Allotment DataFrame.
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            Pivot table suitable for heatmap visualization.
        """
        # Transform to long format
        transformed = self.transform_allotment_data(df)
        
        if transformed.empty:
            return pd.DataFrame()
        
        # Apply date filter
        if start_date is not None:
            transformed = transformed[transformed['date'] >= pd.to_datetime(start_date)]
        if end_date is not None:
            transformed = transformed[transformed['date'] <= pd.to_datetime(end_date)]
        
        if transformed.empty:
            return pd.DataFrame()
        
        # Create pivot table: trainers vs dates
        pivot = transformed.pivot_table(
            index='trainer',
            columns='date',
            aggfunc='size',
            fill_value=0
        )
        
        return pivot
    
    def get_pending_allotments_from_datapoint(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Calculate pending allotments from Datapoint/Calculation sheet.
        
        This replicates the Excel Formula 2:
        - Filters by date range where trainer is empty
        - Groups by Delivery ID, Course, Batch
        - Counts pending allotments
        
        Args:
            df: Datapoint DataFrame (long format with Date, Trainer columns).
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            DataFrame with Delivery ID, Course, Batch, Pending Allotments.
        """
        if df.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Batch', 'Pending Allotments'])
        
        # Work with a copy
        filtered = df.copy()
        
        # Identify date column
        date_col = 'Date' if 'Date' in filtered.columns else 'date'
        if date_col not in filtered.columns:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Batch', 'Pending Allotments'])
        
        # Identify trainer column
        trainer_col = 'Trainer' if 'Trainer' in filtered.columns else 'trainer'
        
        # Convert date column to datetime if needed
        if not pd.api.types.is_datetime64_any_dtype(filtered[date_col]):
            filtered[date_col] = pd.to_datetime(filtered[date_col], errors='coerce')
        
        # Apply date range filter
        if start_date is not None:
            filtered = filtered[filtered[date_col] >= pd.to_datetime(start_date)]
        if end_date is not None:
            filtered = filtered[filtered[date_col] <= pd.to_datetime(end_date)]
        
        if filtered.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Batch', 'Pending Allotments'])
        
        # Filter for empty trainers (pending allotments)
        if trainer_col in filtered.columns:
            pending_mask = (
                filtered[trainer_col].isna() |
                (filtered[trainer_col].astype(str).str.strip() == '') |
                (filtered[trainer_col].astype(str).str.strip().str.lower() == 'nan')
            )
            pending = filtered[pending_mask]
        else:
            pending = filtered
        
        if pending.empty:
            return pd.DataFrame(columns=['Delivery ID', 'Course', 'Batch', 'Pending Allotments'])
        
        # Determine grouping columns (try different column names)
        delivery_col = 'Delivery ID' if 'Delivery ID' in pending.columns else None
        course_col = 'Course' if 'Course' in pending.columns else ('Course Name' if 'Course Name' in pending.columns else None)
        batch_col = 'Batch' if 'Batch' in pending.columns else None
        
        group_cols = []
        if delivery_col:
            group_cols.append(delivery_col)
        if course_col:
            group_cols.append(course_col)
        if batch_col:
            group_cols.append(batch_col)
        
        if not group_cols:
            return pd.DataFrame({'Pending Allotments': [len(pending)]})
        
        # Group and count
        result = pending.groupby(group_cols, dropna=False).size().reset_index(name='Pending Allotments')
        result = result.sort_values('Pending Allotments', ascending=False)
        
        # Rename columns for consistency
        column_map = {}
        if course_col and course_col != 'Course':
            column_map[course_col] = 'Course'
        if column_map:
            result = result.rename(columns=column_map)
        
        return result
    
    def process_datapoint_data(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        exclude_statuses: Optional[List[str]] = None
    ) -> pd.DataFrame:
        """Process Datapoint/Calculation data with filters.
        
        Args:
            df: Datapoint DataFrame.
            start_date: Start of date range.
            end_date: End of date range.
            exclude_statuses: Status values to exclude.
            
        Returns:
            Filtered DataFrame.
        """
        if df.empty:
            return df
        
        if exclude_statuses is None:
            exclude_statuses = self.config.EXCLUDE_VALUES
        
        filtered = df.copy()
        
        # Date filtering
        date_col = 'Date' if 'Date' in filtered.columns else 'date'
        if date_col in filtered.columns:
            if not pd.api.types.is_datetime64_any_dtype(filtered[date_col]):
                filtered[date_col] = pd.to_datetime(filtered[date_col], errors='coerce')
            
            if start_date is not None:
                filtered = filtered[filtered[date_col] >= pd.to_datetime(start_date)]
            if end_date is not None:
                filtered = filtered[filtered[date_col] <= pd.to_datetime(end_date)]
        
        return filtered
    
    def get_trainer_assignments_from_datapoint(
        self,
        df: pd.DataFrame,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> pd.DataFrame:
        """Get trainer assignment counts from Datapoint data.
        
        Args:
            df: Datapoint DataFrame.
            start_date: Start of date range.
            end_date: End of date range.
            
        Returns:
            DataFrame with trainer and assignment count.
        """
        if df.empty:
            return pd.DataFrame(columns=['Trainer', 'Assignments'])
        
        filtered = self.process_datapoint_data(df, start_date, end_date)
        
        if filtered.empty:
            return pd.DataFrame(columns=['Trainer', 'Assignments'])
        
        # Find trainer column
        trainer_col = 'Trainer' if 'Trainer' in filtered.columns else 'trainer'
        
        if trainer_col not in filtered.columns:
            return pd.DataFrame(columns=['Trainer', 'Assignments'])
        
        # Filter for non-empty trainers
        assigned = filtered[
            filtered[trainer_col].notna() &
            (filtered[trainer_col].astype(str).str.strip() != '') &
            (filtered[trainer_col].astype(str).str.strip().str.lower() != 'nan')
        ]
        
        if assigned.empty:
            return pd.DataFrame(columns=['Trainer', 'Assignments'])
        
        # Count assignments per trainer
        result = assigned.groupby(trainer_col).size().reset_index(name='Assignments')
        result.columns = ['Trainer', 'Assignments']
        result = result.sort_values('Assignments', ascending=False)
        
        return result
