"""Visualization components for the Training Dashboard."""

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
from typing import Optional, Dict, Any, List
import streamlit as st

from .config import Config


class Visualizations:
    """Create interactive visualizations using Plotly."""
    
    def __init__(self, config: Optional[Config] = None):
        """Initialize visualizations.
        
        Args:
            config: Configuration object. Uses default if not provided.
        """
        self.config = config or Config()
        
        # Define color scheme
        self.status_colors = {
            'Completed': self.config.COLOR_COMPLETED,
            'Ongoing': self.config.COLOR_ONGOING,
            'Upcoming': self.config.COLOR_UPCOMING,
        }
        
        # Default plotly template
        self.template = 'plotly_white'
    
    def create_kpi_card(
        self,
        title: str,
        value: Any,
        delta: Optional[str] = None,
        icon: Optional[str] = None
    ):
        """Create a KPI metric card using Streamlit.
        
        Args:
            title: Card title.
            value: Main value to display.
            delta: Optional delta/change indicator.
            icon: Optional emoji icon.
        """
        if icon:
            title = f"{icon} {title}"
        
        st.metric(
            label=title,
            value=value,
            delta=delta
        )
    
    def create_status_distribution_chart(
        self,
        df: pd.DataFrame,
        height: int = 300
    ) -> go.Figure:
        """Create a donut chart showing program status distribution.
        
        Args:
            df: DataFrame with 'Status' and 'count' columns.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No data available", height)
        
        # Map colors
        colors = [self.status_colors.get(status, '#6c757d') for status in df['Status']]
        
        fig = go.Figure(data=[go.Pie(
            labels=df['Status'],
            values=df['count'],
            hole=0.4,
            marker_colors=colors,
            textinfo='label+percent',
            textposition='outside',
            hovertemplate='%{label}<br>Count: %{value}<br>%{percent}<extra></extra>'
        )])
        
        fig.update_layout(
            title='Program Status Distribution',
            height=height,
            template=self.template,
            showlegend=True,
            legend=dict(orientation='h', yanchor='bottom', y=-0.2, xanchor='center', x=0.5),
            margin=dict(t=50, b=50, l=20, r=20)
        )
        
        return fig
    
    def create_campus_bar_chart(
        self,
        df: pd.DataFrame,
        height: int = 300
    ) -> go.Figure:
        """Create a horizontal bar chart showing programs by campus.
        
        Args:
            df: DataFrame with 'Campus' and 'count' columns.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No data available", height)
        
        # Sort by count
        df = df.sort_values('count', ascending=True)
        
        fig = go.Figure(data=[go.Bar(
            x=df['count'],
            y=df['Campus'],
            orientation='h',
            marker_color=self.config.COLOR_PRIMARY,
            text=df['count'],
            textposition='outside',
            hovertemplate='%{y}<br>Programs: %{x}<extra></extra>'
        )])
        
        fig.update_layout(
            title='Programs by Campus',
            height=height,
            template=self.template,
            xaxis_title='Number of Programs',
            yaxis_title='',
            margin=dict(t=50, b=50, l=20, r=20)
        )
        
        return fig
    
    def create_course_bar_chart(
        self,
        df: pd.DataFrame,
        height: int = 300,
        top_n: int = 10
    ) -> go.Figure:
        """Create a bar chart showing programs by course.
        
        Args:
            df: DataFrame with 'Course Name' and 'count' columns.
            height: Chart height in pixels.
            top_n: Number of top courses to show.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No data available", height)
        
        # Get top N courses
        df = df.head(top_n).sort_values('count', ascending=True)
        
        fig = go.Figure(data=[go.Bar(
            x=df['count'],
            y=df['Course Name'],
            orientation='h',
            marker_color=self.config.COLOR_UPCOMING,
            text=df['count'],
            textposition='outside',
            hovertemplate='%{y}<br>Programs: %{x}<extra></extra>'
        )])
        
        fig.update_layout(
            title=f'Top {top_n} Courses',
            height=height,
            template=self.template,
            xaxis_title='Number of Programs',
            yaxis_title='',
            margin=dict(t=50, b=50, l=20, r=20)
        )
        
        return fig
    
    def create_trainer_utilization_chart(
        self,
        df: pd.DataFrame,
        height: int = 400,
        top_n: int = 15
    ) -> go.Figure:
        """Create a bar chart showing trainer utilization.
        
        Args:
            df: DataFrame with 'trainer' and 'days_assigned' columns.
            height: Chart height in pixels.
            top_n: Number of top trainers to show.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No trainer data available", height)
        
        # Get top N trainers by utilization
        df = df.head(top_n).sort_values('days_assigned', ascending=True)
        
        fig = go.Figure(data=[go.Bar(
            x=df['days_assigned'],
            y=df['trainer'],
            orientation='h',
            marker_color=self.config.COLOR_COMPLETED,
            text=df['days_assigned'],
            textposition='outside',
            hovertemplate='%{y}<br>Days Assigned: %{x}<extra></extra>'
        )])
        
        fig.update_layout(
            title=f'Top {top_n} Trainers by Utilization',
            height=height,
            template=self.template,
            xaxis_title='Days Assigned',
            yaxis_title='',
            margin=dict(t=50, b=50, l=20, r=100)
        )
        
        return fig
    
    def create_daily_trend_chart(
        self,
        df: pd.DataFrame,
        height: int = 300
    ) -> go.Figure:
        """Create a line chart showing daily allocation trends.
        
        Args:
            df: DataFrame with 'date', 'assigned', 'unassigned' columns.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No trend data available", height)
        
        fig = go.Figure()
        
        # Assigned line
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['assigned'],
            mode='lines+markers',
            name='Assigned',
            line=dict(color=self.config.COLOR_COMPLETED, width=2),
            marker=dict(size=6),
            hovertemplate='Date: %{x}<br>Assigned: %{y}<extra></extra>'
        ))
        
        # Unassigned line
        fig.add_trace(go.Scatter(
            x=df['date'],
            y=df['unassigned'],
            mode='lines+markers',
            name='Unassigned',
            line=dict(color=self.config.COLOR_DANGER, width=2),
            marker=dict(size=6),
            hovertemplate='Date: %{x}<br>Unassigned: %{y}<extra></extra>'
        ))
        
        fig.update_layout(
            title='Daily Allocation Trend',
            height=height,
            template=self.template,
            xaxis_title='Date',
            yaxis_title='Number of Slots',
            legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
            margin=dict(t=70, b=50, l=50, r=20),
            hovermode='x unified'
        )
        
        return fig
    
    def create_unassigned_slots_chart(
        self,
        df: pd.DataFrame,
        height: int = 300
    ) -> go.Figure:
        """Create a bar chart showing unassigned slots by program.
        
        Args:
            df: DataFrame with program info and 'count' column.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No unassigned slots", height)
        
        # Create label from available columns
        label_cols = []
        for col in ['Delivery ID', 'Campus', 'Course Name']:
            if col in df.columns:
                label_cols.append(col)
        
        if label_cols:
            df = df.head(15)  # Top 15
            df['label'] = df[label_cols].astype(str).agg(' - '.join, axis=1)
        else:
            df['label'] = df.index.astype(str)
        
        df = df.sort_values('count', ascending=True)
        
        fig = go.Figure(data=[go.Bar(
            x=df['count'],
            y=df['label'],
            orientation='h',
            marker_color=self.config.COLOR_DANGER,
            text=df['count'],
            textposition='outside',
            hovertemplate='%{y}<br>Unassigned Slots: %{x}<extra></extra>'
        )])
        
        fig.update_layout(
            title='Programs with Unassigned Slots',
            height=height,
            template=self.template,
            xaxis_title='Unassigned Slot Count',
            yaxis_title='',
            margin=dict(t=50, b=50, l=20, r=20)
        )
        
        return fig
    
    def create_allocation_heatmap(
        self,
        df: pd.DataFrame,
        height: int = 500
    ) -> go.Figure:
        """Create a heatmap showing trainer allocation over dates.
        
        Args:
            df: Pivot table with trainers as rows and dates as columns.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No allocation data available", height)
        
        # Limit to top 20 trainers for readability
        if len(df) > 20:
            df = df.head(20)
        
        # Format date columns for display
        columns = [col.strftime('%d-%b') if hasattr(col, 'strftime') else str(col) 
                   for col in df.columns]
        
        fig = go.Figure(data=go.Heatmap(
            z=df.values,
            x=columns,
            y=df.index,
            colorscale='Blues',
            hovertemplate='Trainer: %{y}<br>Date: %{x}<br>Sessions: %{z}<extra></extra>'
        ))
        
        fig.update_layout(
            title='Trainer Allocation Heatmap',
            height=height,
            template=self.template,
            xaxis_title='Date',
            yaxis_title='Trainer',
            margin=dict(t=50, b=80, l=100, r=20)
        )
        
        # Rotate x-axis labels
        fig.update_xaxes(tickangle=45)
        
        return fig
    
    def create_status_by_campus_chart(
        self,
        df: pd.DataFrame,
        height: int = 400
    ) -> go.Figure:
        """Create a stacked bar chart showing status distribution by campus.
        
        Args:
            df: Raw allotment DataFrame.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        # Find campus/client column
        campus_col = 'Campus' if 'Campus' in df.columns else ('Client' if 'Client' in df.columns else None)
        
        if df.empty or 'Status' not in df.columns or campus_col is None:
            return self._empty_chart("No data available", height)
        
        # Get unique programs
        if 'Delivery ID' in df.columns:
            unique_df = df.drop_duplicates(subset=['Delivery ID'])
        else:
            unique_df = df
        
        # Create crosstab
        crosstab = pd.crosstab(unique_df[campus_col], unique_df['Status'])
        
        fig = go.Figure()
        
        for status in crosstab.columns:
            color = self.status_colors.get(status, '#6c757d')
            fig.add_trace(go.Bar(
                name=status,
                x=crosstab.index,
                y=crosstab[status],
                marker_color=color,
                hovertemplate='%{x}<br>' + status + ': %{y}<extra></extra>'
            ))
        
        fig.update_layout(
            title='Status Distribution by Campus',
            height=height,
            template=self.template,
            barmode='stack',
            xaxis_title='Campus',
            yaxis_title='Number of Programs',
            legend=dict(orientation='h', yanchor='bottom', y=1.02, xanchor='right', x=1),
            margin=dict(t=70, b=80, l=50, r=20)
        )
        
        # Rotate x-axis labels
        fig.update_xaxes(tickangle=45)
        
        return fig
    
    def _empty_chart(self, message: str, height: int = 300) -> go.Figure:
        """Create an empty chart with a message.
        
        Args:
            message: Message to display.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        fig = go.Figure()
        
        fig.add_annotation(
            text=message,
            xref='paper',
            yref='paper',
            x=0.5,
            y=0.5,
            showarrow=False,
            font=dict(size=16, color='gray')
        )
        
        fig.update_layout(
            height=height,
            template=self.template,
            xaxis=dict(showgrid=False, showticklabels=False, zeroline=False),
            yaxis=dict(showgrid=False, showticklabels=False, zeroline=False)
        )
        
        return fig
    
    def display_data_table(
        self,
        df: pd.DataFrame,
        title: str = "Data Table",
        height: int = 400
    ):
        """Display an interactive data table using Streamlit.
        
        Args:
            df: DataFrame to display.
            title: Table title.
            height: Table height in pixels.
        """
        st.subheader(title)
        
        if df.empty:
            st.info("No data to display")
            return
        
        # Use Streamlit's dataframe display
        st.dataframe(
            df,
            height=height,
            use_container_width=True
        )
    
    def create_summary_metrics(
        self,
        total_programs: int,
        ongoing_programs: int,
        completed_programs: int,
        upcoming_programs: int,
        total_trainers: int,
        unassigned_slots: int
    ):
        """Create summary KPI metrics row.
        
        Args:
            total_programs: Total number of programs.
            ongoing_programs: Number of ongoing programs.
            completed_programs: Number of completed programs.
            upcoming_programs: Number of upcoming programs.
            total_trainers: Total number of active trainers.
            unassigned_slots: Number of unassigned training slots.
        """
        cols = st.columns(6)
        
        with cols[0]:
            self.create_kpi_card("Total Programs", total_programs, icon="📚")
        
        with cols[1]:
            self.create_kpi_card("Ongoing", ongoing_programs, icon="🔄")
        
        with cols[2]:
            self.create_kpi_card("Completed", completed_programs, icon="✅")
        
        with cols[3]:
            self.create_kpi_card("Upcoming", upcoming_programs, icon="📅")
        
        with cols[4]:
            self.create_kpi_card("Active Trainers", total_trainers, icon="👨‍🏫")
        
        with cols[5]:
            self.create_kpi_card("Pending Allotments", unassigned_slots, icon="⚠️")
    
    def create_pending_allotments_table(
        self,
        df: pd.DataFrame,
        height: int = 400
    ) -> go.Figure:
        """Create a bar chart showing pending allotments by program.
        
        Args:
            df: DataFrame with Delivery ID, Course, Batch, Pending Allotments.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty or 'Pending Allotments' not in df.columns:
            return self._empty_chart("No pending allotments found", height)
        
        # Create label
        label_cols = []
        for col in ['Delivery ID', 'Course', 'Batch']:
            if col in df.columns:
                label_cols.append(col)
        
        df_plot = df.head(20).copy()  # Top 20
        
        if label_cols:
            df_plot['label'] = df_plot[label_cols].astype(str).agg(' | '.join, axis=1)
        else:
            df_plot['label'] = df_plot.index.astype(str)
        
        df_plot = df_plot.sort_values('Pending Allotments', ascending=True)
        
        fig = go.Figure(data=[go.Bar(
            x=df_plot['Pending Allotments'],
            y=df_plot['label'],
            orientation='h',
            marker_color=self.config.COLOR_DANGER,
            text=df_plot['Pending Allotments'],
            textposition='outside',
            hovertemplate='%{y}<br>Pending: %{x}<extra></extra>'
        )])
        
        fig.update_layout(
            title='Programs with Pending Allotments',
            height=height,
            template=self.template,
            xaxis_title='Pending Allotment Count',
            yaxis_title='',
            margin=dict(t=50, b=50, l=200, r=50)
        )
        
        return fig
    
    def create_client_summary_chart(
        self,
        df: pd.DataFrame,
        height: int = 300
    ) -> go.Figure:
        """Create a bar chart showing programs by client/campus.
        
        Args:
            df: DataFrame with Client column.
            height: Chart height in pixels.
            
        Returns:
            Plotly figure.
        """
        if df.empty:
            return self._empty_chart("No data available", height)
        
        # Find client/campus column
        client_col = None
        for col in ['Client', 'Campus']:
            if col in df.columns:
                client_col = col
                break
        
        if client_col is None:
            return self._empty_chart("No client/campus data", height)
        
        # Count unique delivery IDs per client
        if 'Delivery ID' in df.columns:
            counts = df.groupby(client_col)['Delivery ID'].nunique().reset_index()
            counts.columns = [client_col, 'count']
        else:
            counts = df[client_col].value_counts().reset_index()
            counts.columns = [client_col, 'count']
        
        counts = counts.sort_values('count', ascending=True)
        
        fig = go.Figure(data=[go.Bar(
            x=counts['count'],
            y=counts[client_col],
            orientation='h',
            marker_color=self.config.COLOR_PRIMARY,
            text=counts['count'],
            textposition='outside',
            hovertemplate='%{y}<br>Programs: %{x}<extra></extra>'
        )])
        
        fig.update_layout(
            title=f'Programs by {client_col}',
            height=height,
            template=self.template,
            xaxis_title='Number of Programs',
            yaxis_title='',
            margin=dict(t=50, b=50, l=20, r=20)
        )
        
        return fig
