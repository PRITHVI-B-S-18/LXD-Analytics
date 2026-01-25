"""Training Data Visualization Dashboard - Main Application."""

import streamlit as st
import pandas as pd
from datetime import datetime, timedelta
from pathlib import Path

# Import local modules
from src.data_loader import DataLoader, create_sample_data
from src.data_transformer import DataTransformer
from src.visualizations import Visualizations
from src.config import Config


def init_session_state():
    """Initialize session state variables."""
    if 'data_loaded' not in st.session_state:
        st.session_state.data_loaded = False
    if 'trainer_data' not in st.session_state:
        st.session_state.trainer_data = None
    if 'allotment_data' not in st.session_state:
        st.session_state.allotment_data = None
    if 'datapoint_data' not in st.session_state:
        st.session_state.datapoint_data = None
    if 'use_sample_data' not in st.session_state:
        st.session_state.use_sample_data = False


def load_data(uploaded_file=None, use_sample=False):
    """Load data from file or sample."""
    loader = DataLoader()
    
    if use_sample:
        trainer_df, allotment_df = create_sample_data()
        st.session_state.trainer_data = trainer_df
        st.session_state.allotment_data = allotment_df
        st.session_state.datapoint_data = None
        st.session_state.data_loaded = True
        st.session_state.use_sample_data = True
        return trainer_df, allotment_df, None
    
    if uploaded_file is not None:
        trainer_df, allotment_df, datapoint_df = loader.load_from_uploaded_file(uploaded_file)
        st.session_state.trainer_data = trainer_df
        st.session_state.allotment_data = allotment_df
        st.session_state.datapoint_data = datapoint_df
        st.session_state.data_loaded = True
        st.session_state.use_sample_data = False
        return trainer_df, allotment_df, datapoint_df
    
    return None, None, None


def render_sidebar(config: Config, allotment_df: pd.DataFrame, trainer_df: pd.DataFrame, transformer: DataTransformer):
    """Render the sidebar with filters."""
    st.sidebar.header("🔍 Filters")
    
    # Date range filter
    st.sidebar.subheader("Date Range")
    date_cols = transformer.get_date_columns(allotment_df)
    
    if date_cols:
        # Parse date columns
        dates = []
        for col in date_cols:
            try:
                if isinstance(col, str):
                    # Try multiple date formats
                    for fmt in ['%d-%b-%y', '%-d-%b-%y', '%d-%b-%Y']:
                        try:
                            parsed = datetime.strptime(col.strip(), fmt)
                            dates.append(parsed)
                            break
                        except ValueError:
                            continue
                elif isinstance(col, datetime):
                    dates.append(col)
            except:
                pass
        
        if dates:
            min_date = min(dates)
            max_date = max(dates)
        else:
            min_date = datetime.now() - timedelta(days=30)
            max_date = datetime.now() + timedelta(days=30)
    else:
        min_date = datetime.now() - timedelta(days=30)
        max_date = datetime.now() + timedelta(days=30)
    
    col1, col2 = st.sidebar.columns(2)
    with col1:
        start_date = st.date_input(
            "Start Date",
            value=min_date,
            min_value=min_date,
            max_value=max_date
        )
    with col2:
        end_date = st.date_input(
            "End Date",
            value=max_date,
            min_value=min_date,
            max_value=max_date
        )
    
    # Status filter
    st.sidebar.subheader("Status")
    status_options = ['Completed', 'Ongoing', 'Upcoming']
    if 'Status' in allotment_df.columns:
        # Convert to strings and sort to handle mixed types
        status_options = sorted([str(x) for x in allotment_df['Status'].dropna().unique().tolist()])
    
    selected_status = st.sidebar.multiselect(
        "Select Status",
        options=status_options,
        default=status_options
    )
    
    # Campus/Client filter
    st.sidebar.subheader("Campus/Client")
    campus_options = []
    campus_col = 'Campus' if 'Campus' in allotment_df.columns else ('Client' if 'Client' in allotment_df.columns else None)
    if campus_col:
        # Convert to strings and sort to handle mixed types
        campus_options = sorted([str(x) for x in allotment_df[campus_col].dropna().unique().tolist()])
    
    selected_campus = st.sidebar.multiselect(
        "Select Campus/Client",
        options=campus_options,
        default=campus_options
    )
    
    # Course filter
    st.sidebar.subheader("Course")
    course_options = []
    course_col = 'Course Name' if 'Course Name' in allotment_df.columns else ('Course' if 'Course' in allotment_df.columns else None)
    if course_col:
        # Convert to strings and sort to handle mixed types
        course_options = sorted([str(x) for x in allotment_df[course_col].dropna().unique().tolist()])
    
    selected_course = st.sidebar.multiselect(
        "Select Course",
        options=course_options,
        default=course_options
    )
    
    # Trainer Type filter (from trainer data)
    st.sidebar.subheader("Trainer Type")
    trainer_type_options = config.TRAINER_TYPES or []
    if trainer_df is not None and not trainer_df.empty and 'Trainer Type' in trainer_df.columns:
        # Convert to strings and sort to handle mixed types
        trainer_type_options = sorted([str(x) for x in trainer_df['Trainer Type'].dropna().unique().tolist()])
    
    selected_trainer_type = st.sidebar.multiselect(
        "Select Trainer Type",
        options=trainer_type_options,
        default=trainer_type_options
    )
    
    return {
        'start_date': datetime.combine(start_date, datetime.min.time()),
        'end_date': datetime.combine(end_date, datetime.max.time()),
        'status': selected_status,
        'campus': selected_campus,
        'course': selected_course,
        'trainer_type': selected_trainer_type
    }


def calculate_metrics(allotment_df: pd.DataFrame, datapoint_df: pd.DataFrame, transformer: DataTransformer, filters: dict):
    """Calculate KPI metrics."""
    # Use datapoint_df if available (pre-transformed long format)
    has_datapoint = datapoint_df is not None and not datapoint_df.empty
    has_allotment = allotment_df is not None and not allotment_df.empty
    
    if not has_allotment and not has_datapoint:
        return {
            'total_programs': 0,
            'ongoing': 0,
            'completed': 0,
            'upcoming': 0,
            'total_trainers': 0,
            'pending_allotments': 0
        }
    
    # Calculate from datapoint (long format) if available
    if has_datapoint:
        # Get unique programs from datapoint
        if 'Delivery ID' in datapoint_df.columns:
            unique_programs = datapoint_df.drop_duplicates(subset=['Delivery ID'])
        else:
            unique_programs = datapoint_df
        
        # Apply status filter
        if 'Status' in unique_programs.columns:
            filtered_programs = unique_programs[unique_programs['Status'].isin(filters.get('status', []))]
        else:
            filtered_programs = unique_programs
        
        # Apply client/campus filter
        campus_col = 'Client' if 'Client' in filtered_programs.columns else 'Campus'
        if campus_col in filtered_programs.columns and filters.get('campus'):
            filtered_programs = filtered_programs[filtered_programs[campus_col].isin(filters['campus'])]
        
        # Apply course filter
        course_col = 'Course' if 'Course' in filtered_programs.columns else 'Course Name'
        if course_col in filtered_programs.columns and filters.get('course'):
            filtered_programs = filtered_programs[filtered_programs[course_col].isin(filters['course'])]
        
        total_programs = filtered_programs['Delivery ID'].nunique() if 'Delivery ID' in filtered_programs.columns else len(filtered_programs)
        
        # Count by status
        status_counts = {}
        if 'Status' in unique_programs.columns:
            unique_for_status = unique_programs.drop_duplicates(subset=['Delivery ID']) if 'Delivery ID' in unique_programs.columns else unique_programs
            status_counts = unique_for_status['Status'].value_counts().to_dict()
        
        # Count active trainers from datapoint
        trainer_col = 'Trainer' if 'Trainer' in datapoint_df.columns else 'trainer'
        if trainer_col in datapoint_df.columns:
            # Filter out empty trainers
            assigned = datapoint_df[
                datapoint_df[trainer_col].notna() &
                (datapoint_df[trainer_col].astype(str).str.strip() != '') &
                (datapoint_df[trainer_col].astype(str).str.strip().str.lower() != 'nan')
            ]
            total_trainers = assigned[trainer_col].nunique()
        else:
            total_trainers = 0
        
        # Count pending allotments
        pending = transformer.get_pending_allotments_from_datapoint(
            datapoint_df,
            start_date=filters.get('start_date'),
            end_date=filters.get('end_date')
        )
        pending_allotments = pending['Pending Allotments'].sum() if not pending.empty and 'Pending Allotments' in pending.columns else 0
    
    else:
        # Fallback to allotment_df (wide format)
        if 'Delivery ID' in allotment_df.columns:
            unique_programs = allotment_df.drop_duplicates(subset=['Delivery ID'])
        else:
            unique_programs = allotment_df
        
        # Apply status filter
        if 'Status' in unique_programs.columns:
            filtered_programs = unique_programs[unique_programs['Status'].isin(filters.get('status', []))]
        else:
            filtered_programs = unique_programs
        
        # Apply campus filter
        if 'Campus' in filtered_programs.columns and filters.get('campus'):
            filtered_programs = filtered_programs[filtered_programs['Campus'].isin(filters['campus'])]
        
        # Apply course filter
        if 'Course Name' in filtered_programs.columns and filters.get('course'):
            filtered_programs = filtered_programs[filtered_programs['Course Name'].isin(filters['course'])]
        
        total_programs = len(filtered_programs)
        
        # Count by status
        status_counts = {}
        if 'Status' in filtered_programs.columns:
            status_counts = filtered_programs['Status'].value_counts().to_dict()
        
        # Count active trainers (from transformed data)
        transformed = transformer.transform_allotment_data(allotment_df)
        if not transformed.empty and 'trainer' in transformed.columns:
            total_trainers = transformed['trainer'].nunique()
        else:
            total_trainers = 0
        
        # Count unassigned slots
        unassigned = transformer.get_unassigned_slots(
            allotment_df,
            start_date=filters.get('start_date'),
            end_date=filters.get('end_date')
        )
        pending_allotments = unassigned['count'].sum() if not unassigned.empty and 'count' in unassigned.columns else 0
    
    ongoing = status_counts.get('Ongoing', 0)
    completed = status_counts.get('Completed', 0)
    upcoming = status_counts.get('Upcoming', 0)
    
    return {
        'total_programs': total_programs,
        'ongoing': ongoing,
        'completed': completed,
        'upcoming': upcoming,
        'total_trainers': total_trainers,
        'pending_allotments': int(pending_allotments)
    }


def main():
    """Main application entry point."""
    # Page configuration
    config = Config()
    st.set_page_config(
        page_title=config.PAGE_TITLE,
        page_icon=config.PAGE_ICON,
        layout=config.LAYOUT,
        initial_sidebar_state="expanded"
    )
    
    # Custom CSS for better styling
    st.markdown("""
        <style>
        .main-header {
            font-size: 2.5rem;
            font-weight: bold;
            color: #1f77b4;
            margin-bottom: 0.5rem;
        }
        .sub-header {
            font-size: 1rem;
            color: #666;
            margin-bottom: 2rem;
        }
        .metric-card {
            background-color: #f8f9fa;
            padding: 1rem;
            border-radius: 0.5rem;
            border-left: 4px solid #1f77b4;
        }
        div[data-testid="stMetric"] {
            background-color: #f8f9fa;
            padding: 1rem;
            border-radius: 0.5rem;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Initialize session state
    init_session_state()
    
    # Header
    st.markdown('<p class="main-header">📊 Training Dashboard</p>', unsafe_allow_html=True)
    st.markdown('<p class="sub-header">Visualize trainer allocations, program status, and training metrics</p>', unsafe_allow_html=True)
    
    # Initialize components
    transformer = DataTransformer(config)
    viz = Visualizations(config)
    
    # Data upload section
    with st.sidebar:
        st.header("📁 Data Source")
        
        uploaded_file = st.file_uploader(
            "Upload Excel File",
            type=['xlsx', 'xls'],
            help="Upload your training data Excel file"
        )
        
        col1, col2 = st.columns(2)
        with col1:
            if st.button("Load Data", type="primary", disabled=uploaded_file is None):
                with st.spinner("Loading data..."):
                    load_data(uploaded_file)
                st.success("Data loaded!")
                st.rerun()
        
        with col2:
            if st.button("Use Sample Data"):
                with st.spinner("Generating sample data..."):
                    load_data(use_sample=True)
                st.success("Sample data loaded!")
                st.rerun()
        
        if st.session_state.data_loaded:
            st.divider()
            if st.session_state.use_sample_data:
                st.info("📊 Using sample data for demo")
            else:
                st.success("✅ Data loaded successfully")
    
    # Main content - only show if data is loaded
    if not st.session_state.data_loaded:
        st.info("👆 Upload an Excel file or click 'Use Sample Data' to get started")
        
        # Show expected data format
        with st.expander("📋 Expected Data Format"):
            st.markdown("""
            Your Excel file should contain the following sheets and columns:
            
            **Allotment Data Sheet:**
            - `Delivery ID` - Unique identifier for each training program
            - `Status` - Program status (Completed, Ongoing, Upcoming)
            - `Campus` - Training location
            - `Course Name` - Name of the course
            - Date columns (e.g., `01-Dec-25`, `02-Dec-25`) - Trainer assignments for each date
            
            **Trainer Data Sheet (Optional):**
            - `pt` - Trainer ID
            - `Trainer Type` - Category of trainer
            - `Trainer Name` - Full name
            - `Trainer Email` - Email address
            - `Trainer Phone` - Contact number
            - Vendor details (if applicable)
            """)
        return
    
    # Get data from session state
    allotment_df = st.session_state.allotment_data
    trainer_df = st.session_state.trainer_data
    datapoint_df = st.session_state.datapoint_data
    
    # Check if we have data to work with
    has_allotment = allotment_df is not None and not allotment_df.empty
    has_datapoint = datapoint_df is not None and not datapoint_df.empty
    
    if not has_allotment and not has_datapoint:
        st.warning("No data available. Please check your Excel file contains 'Allotment Data' or 'Datapoint/Calculation' sheet.")
        return
    
    # Use datapoint_df as primary if available (it's pre-transformed)
    primary_df = datapoint_df if has_datapoint else allotment_df
    
    # Render sidebar filters (pass primary_df for column detection)
    filters = render_sidebar(config, primary_df, trainer_df, transformer)
    
    # Apply filters to data
    if has_allotment:
        filtered_df = transformer.filter_data(
            allotment_df,
            status=filters['status'],
            campus=filters['campus'],
            course=filters['course']
        )
    else:
        filtered_df = primary_df
    
    # Calculate metrics
    metrics = calculate_metrics(allotment_df if has_allotment else pd.DataFrame(), 
                                datapoint_df, transformer, filters)
    
    # KPI Cards Row
    st.markdown("### 📈 Key Metrics")
    viz.create_summary_metrics(
        total_programs=metrics['total_programs'],
        ongoing_programs=metrics['ongoing'],
        completed_programs=metrics['completed'],
        upcoming_programs=metrics['upcoming'],
        total_trainers=metrics['total_trainers'],
        unassigned_slots=metrics['pending_allotments']
    )
    
    st.divider()
    
    # Charts - Row 1
    col1, col2 = st.columns(2)
    
    with col1:
        status_summary = transformer.get_program_status_summary(filtered_df)
        fig = viz.create_status_distribution_chart(status_summary, height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        campus_summary = transformer.get_campus_summary(filtered_df)
        fig = viz.create_campus_bar_chart(campus_summary, height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    # Charts - Row 2
    col1, col2 = st.columns(2)
    
    with col1:
        course_summary = transformer.get_course_summary(filtered_df)
        fig = viz.create_course_bar_chart(course_summary, height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        fig = viz.create_status_by_campus_chart(filtered_df, height=350)
        st.plotly_chart(fig, use_container_width=True)
    
    st.divider()
    
    # Daily Trend Chart
    st.markdown("### 📅 Daily Allocation Trends")
    daily_summary = transformer.get_daily_allocation_summary(
        filtered_df,
        start_date=filters['start_date'],
        end_date=filters['end_date']
    )
    fig = viz.create_daily_trend_chart(daily_summary, height=350)
    st.plotly_chart(fig, use_container_width=True)
    
    # Trainer and Pending Allotments sections
    col1, col2 = st.columns(2)
    
    with col1:
        st.markdown("### 👨‍🏫 Trainer Utilization")
        # Use datapoint data if available
        if has_datapoint:
            trainer_util = transformer.get_trainer_assignments_from_datapoint(
                datapoint_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
            trainer_util = trainer_util.rename(columns={'Assignments': 'days_assigned', 'Trainer': 'trainer'})
        else:
            trainer_util = transformer.get_trainer_utilization(
                filtered_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
        fig = viz.create_trainer_utilization_chart(trainer_util, height=400)
        st.plotly_chart(fig, use_container_width=True)
    
    with col2:
        st.markdown("### ⚠️ Pending Allotments")
        # Use datapoint data if available
        if has_datapoint:
            pending = transformer.get_pending_allotments_from_datapoint(
                datapoint_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
            fig = viz.create_pending_allotments_table(pending, height=400)
        else:
            unassigned = transformer.get_unassigned_slots(
                filtered_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
            fig = viz.create_unassigned_slots_chart(unassigned, height=400)
        st.plotly_chart(fig, use_container_width=True)
    
    st.divider()
    
    # Allocation Heatmap
    st.markdown("### 🗓️ Trainer Allocation Heatmap")
    heatmap_data = transformer.get_allocation_heatmap_data(
        filtered_df,
        start_date=filters['start_date'],
        end_date=filters['end_date']
    )
    fig = viz.create_allocation_heatmap(heatmap_data, height=500)
    st.plotly_chart(fig, use_container_width=True)
    
    st.divider()
    
    # Data Tables
    st.markdown("### 📋 Data Tables")
    
    tab1, tab2, tab3, tab4, tab5 = st.tabs(["📚 Programs", "👨‍🏫 Active Trainers", "⚠️ Pending Allotments", "📇 Trainer Directory", "📊 Raw Data"])
    
    with tab1:
        # Show program details - try multiple column name variations
        display_cols_options = [
            ['Delivery ID', 'Status', 'Campus', 'Course Name', 'Start Date', 'End Date', 'Batch'],
            ['Delivery ID', 'Status', 'Client', 'Course', 'Start Date', 'End Date', 'Batch']
        ]
        
        source_df = datapoint_df if has_datapoint else filtered_df
        available_cols = []
        for cols in display_cols_options:
            available = [col for col in cols if col in source_df.columns]
            if len(available) > len(available_cols):
                available_cols = available
        
        if available_cols:
            programs_df = source_df[available_cols].drop_duplicates()
            st.dataframe(programs_df, use_container_width=True, height=400)
            st.caption(f"Showing {len(programs_df)} unique program entries")
        else:
            st.info("No program data available with expected columns")
    
    with tab2:
        # Show trainer utilization
        if not trainer_util.empty:
            display_util = trainer_util.copy()
            # Rename columns for display
            if 'trainer' in display_util.columns:
                display_util = display_util.rename(columns={'trainer': 'Trainer', 'days_assigned': 'Days/Sessions'})
            st.dataframe(display_util, use_container_width=True, height=400)
            st.caption(f"Showing {len(display_util)} trainers with assignments")
        else:
            st.info("No trainer assignment data available")
    
    with tab3:
        # Show pending allotments
        if has_datapoint:
            pending_table = transformer.get_pending_allotments_from_datapoint(
                datapoint_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
            if not pending_table.empty:
                st.dataframe(pending_table, use_container_width=True, height=400)
                total_pending = pending_table['Pending Allotments'].sum() if 'Pending Allotments' in pending_table.columns else 0
                st.caption(f"Total pending allotments: {total_pending}")
            else:
                st.success("No pending allotments found! All sessions are covered.")
        else:
            unassigned_table = transformer.get_unassigned_slots(
                filtered_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
            if not unassigned_table.empty:
                st.dataframe(unassigned_table, use_container_width=True, height=400)
                total_unassigned = unassigned_table['count'].sum() if 'count' in unassigned_table.columns else len(unassigned_table)
                st.caption(f"Total unassigned slots: {total_unassigned}")
            else:
                st.success("No unassigned slots found! All training sessions are covered.")
    
    with tab4:
        # Show trainer directory from Trainer Data sheet
        if trainer_df is not None and not trainer_df.empty:
            trainer_display_cols = ['pt', 'Trainer Type', 'Trainer Name', 'Trainer Email', 'Trainer Phone']
            available_trainer_cols = [col for col in trainer_display_cols if col in trainer_df.columns]
            
            if available_trainer_cols:
                # Apply trainer type filter
                trainer_filtered = trainer_df.copy()
                if filters.get('trainer_type') and 'Trainer Type' in trainer_filtered.columns:
                    trainer_filtered = trainer_filtered[trainer_filtered['Trainer Type'].isin(filters['trainer_type'])]
                
                st.dataframe(trainer_filtered[available_trainer_cols], use_container_width=True, height=400)
                st.caption(f"Showing {len(trainer_filtered)} trainers")
            else:
                st.info("Trainer data columns not found")
        else:
            st.info("No trainer directory data available. Upload an Excel file with a 'Trainer Data' sheet.")
    
    with tab5:
        # Show raw datapoint data if available
        if has_datapoint:
            st.markdown("**Datapoint/Calculation Sheet Data**")
            # Filter by date range
            filtered_datapoint = transformer.process_datapoint_data(
                datapoint_df,
                start_date=filters['start_date'],
                end_date=filters['end_date']
            )
            st.dataframe(filtered_datapoint.head(500), use_container_width=True, height=400)
            st.caption(f"Showing first 500 of {len(filtered_datapoint)} records (filtered by date range)")
        elif has_allotment:
            st.markdown("**Allotment Data (Wide Format)**")
            st.dataframe(filtered_df.head(100), use_container_width=True, height=400)
            st.caption(f"Showing first 100 of {len(filtered_df)} records")
    
    # Footer
    st.divider()
    st.markdown(
        "<p style='text-align: center; color: #888;'>Training Dashboard v1.0 | "
        "Data refreshes when you upload a new file</p>",
        unsafe_allow_html=True
    )


if __name__ == "__main__":
    main()
