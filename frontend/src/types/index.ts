// API Response Types

export interface UploadResponse {
  success: boolean;
  filename?: string;
  sheets_found?: string[];
  sheets_loaded?: string[];
  trainer_rows?: number;
  allotment_rows?: number;
  datapoint_rows?: number;
  error?: string;
}

export interface SharePointStatus {
  is_configured: boolean;
  is_connected: boolean;
  last_sync: string | null;
  last_error: string | null;
  auto_refresh_enabled: boolean;
  refresh_interval_seconds: number;
  site_url: string | null;
  file_name: string | null;
}

export interface StatusResponse {
  is_loaded: boolean;
  filename?: string;
  trainer_rows: number;
  allotment_rows: number;
  datapoint_rows: number;
  sharepoint?: SharePointStatus;
}

export interface SharePointConnectionResponse {
  success: boolean;
  message: string;
  connection?: {
    site_name: string;
    file_name: string;
    file_size: number;
    last_modified: string;
    web_url: string;
  };
  data?: {
    sheets_found: string[];
    sheets_loaded: string[];
    trainer_rows: number;
    allotment_rows: number;
    datapoint_rows: number;
  };
}

export interface SharePointRefreshResponse {
  success: boolean;
  message: string;
  last_sync: string | null;
  data?: {
    trainer_rows: number;
    allotment_rows: number;
    datapoint_rows: number;
  };
}

export interface DashboardMetrics {
  total_programs: number;
  ongoing: number;
  completed: number;
  upcoming: number;
  active_trainers: number;
  pending_allotments: number;
}

export interface ChartDataItem {
  name: string;
  value: number;
}

export interface DashboardResponse {
  metrics: DashboardMetrics;
  status_distribution: ChartDataItem[];
  client_distribution: ChartDataItem[];
}

export interface PendingAllotment {
  'Delivery ID': string;
  Course: string;
  Client: string;
  Batch: string;
  'Pending Allotments': number;
}

export interface TrainerUtilization {
  Trainer: string;
  Assignments: number;
  'Unique Programs': number;
  'Unique Clients': number;
}

export interface ClientUtilization {
  Client: string;
  'Total Sessions': number;
  Assigned: number;
  Pending: number;
  Programs: number;
}

export interface DeliveryUtilization {
  'Delivery ID': string;
  Course: string;
  Client: string;
  Status: string;
  'Total Sessions': number;
  Assigned: number;
  Pending: number;
}

export interface Program {
  'Delivery ID': string;
  Status: string;
  Course: string;
  Client: string;
  'Start Date': string;
  'End Date': string;
  Batch: string;
}

export interface Trainer {
  pt: string;
  'Trainer Type': string;
  'Trainer Name': string;
  'Trainer Email': string;
  'Trainer Phone': string;
  'Vendor Name': string;
  'Vendor Code': string;
}

export interface DatapointRow {
  'Delivery ID': string;
  Status: string;
  Client: string;
  Course: string;
  'Start Date': string;
  'End Date': string;
  Batch: string;
  Date: string;
  Trainer: string;
  'Trainer Code': string;
  'Trainer Type': string;
}

export interface FilterOptions {
  statuses: string[];
  clients: string[];
  courses: string[];
  trainer_types: string[];
}

export interface DateRange {
  startDate: Date | null;
  endDate: Date | null;
}

// New types for utilization
export interface ProgramItem {
  id: string;
  course: string;
  label: string;
}

export interface TrainerTypeCount {
  type: string;
  count: number;
}

export interface UtilizationMetrics {
  total_allotments: number;
  pending_allotments: number;
  assigned_allotments: number;
}

export interface ProgramSummary {
  program: string;
  total: number;
  assigned: number;
  pending: number;
}

export interface ClientSummary {
  name: string;
  total: number;
  assigned: number;
  pending: number;
}

export interface DailyTrend {
  date: string;
  total: number;
  assigned: number;
  pending: number;
}

export interface UtilizationDataRow {
  'Delivery ID'?: string;
  Client?: string;
  Course?: string;
  Date?: string;
  Trainer?: string;
  'Trainer Type'?: string;
  Status?: string;
}

export interface UtilizationByProgramResponse {
  metrics: UtilizationMetrics;
  trainer_type_chart: ChartDataItem[];
  status_chart: ChartDataItem[];
  programs_summary: ProgramSummary[];
  filtered_data: UtilizationDataRow[];
  filtered_total: number;
}

export interface UtilizationByClientResponse {
  metrics: UtilizationMetrics;
  trainer_type_chart: ChartDataItem[];
  status_chart: ChartDataItem[];
  clients_summary: ClientSummary[];
  filtered_data: UtilizationDataRow[];
  filtered_total: number;
}

export interface UtilizationByDateResponse {
  metrics: UtilizationMetrics;
  trainer_type_chart: ChartDataItem[];
  status_chart: ChartDataItem[];
  daily_trend: DailyTrend[];
  filtered_data: UtilizationDataRow[];
  filtered_total: number;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface DatapointResponse {
  data: DatapointRow[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface RawAllotmentResponse {
  data: Record<string, unknown>[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  columns: string[];
  has_datapoint_sheet: boolean;
}

// By Trainer Utilization Types
export interface TrainerCategory {
  category: string;
  total_trainers: number;
  allocated: number;
  available: number;
  allocation_rate: number;
  allocated_trainers: string[];
}

export interface TrainerUtilizationSummary {
  total_trainers: number;
  total_allocated: number;
  total_available: number;
  allocation_rate: number;
}

export interface UtilizationByTrainerResponse {
  date: string | null;
  categories: TrainerCategory[];
  summary: TrainerUtilizationSummary;
}
