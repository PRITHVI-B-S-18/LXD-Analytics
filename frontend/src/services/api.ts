import axios from 'axios';
import type {
  UploadResponse,
  StatusResponse,
  DashboardResponse,
  PendingAllotment,
  TrainerUtilization,
  ClientUtilization,
  DeliveryUtilization,
  Program,
  Trainer,
  FilterOptions,
  ProgramItem,
  TrainerTypeCount,
  RawAllotmentResponse,
  DatapointResponse,
  UtilizationByProgramResponse,
  UtilizationByClientResponse,
  UtilizationByDateResponse,
  UtilizationByTrainerResponse,
  SharePointStatus,
  SharePointConnectionResponse,
  SharePointRefreshResponse,
} from '../types';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
});

// Helper to serialize arrays properly
const arrayParams = (params: Record<string, unknown>) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((v) => searchParams.append(key, String(v)));
    } else {
      searchParams.append(key, String(value));
    }
  });
  return searchParams.toString();
};

// Format date for API query params
const formatDate = (date: Date | null | undefined): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split('T')[0];
};

export const uploadFile = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<UploadResponse>('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getStatus = async (): Promise<StatusResponse> => {
  const response = await api.get<StatusResponse>('/status');
  return response.data;
};

export const getDashboard = async (
  startDate?: Date | null,
  endDate?: Date | null
): Promise<DashboardResponse> => {
  const response = await api.get<DashboardResponse>('/dashboard', {
    params: {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    },
  });
  return response.data;
};

export const getPendingAllotments = async (
  startDate?: Date | null,
  endDate?: Date | null
): Promise<{ data: PendingAllotment[]; total: number }> => {
  const response = await api.get('/pending-allotments', {
    params: {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    },
  });
  return response.data;
};

export const getUtilizationTrainers = async (
  startDate?: Date | null,
  endDate?: Date | null
): Promise<{ data: TrainerUtilization[] }> => {
  const response = await api.get('/utilization/trainers', {
    params: {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    },
  });
  return response.data;
};

export const getUtilizationClients = async (
  startDate?: Date | null,
  endDate?: Date | null
): Promise<{ data: ClientUtilization[] }> => {
  const response = await api.get('/utilization/clients', {
    params: {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    },
  });
  return response.data;
};

export const getUtilizationDeliveries = async (
  startDate?: Date | null,
  endDate?: Date | null
): Promise<{ data: DeliveryUtilization[] }> => {
  const response = await api.get('/utilization/deliveries', {
    params: {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
    },
  });
  return response.data;
};

export const getPrograms = async (
  status?: string[],
  client?: string[]
): Promise<{ data: Program[] }> => {
  const response = await api.get('/programs', {
    params: { status, client },
    paramsSerializer: {
      indexes: null, // This will serialize arrays as status=a&status=b
    },
  });
  return response.data;
};

export const getTrainers = async (): Promise<{ data: Trainer[] }> => {
  const response = await api.get('/trainers');
  return response.data;
};

export const getDatapoint = async (
  startDate?: Date | null,
  endDate?: Date | null,
  page: number = 1,
  pageSize: number = 50
): Promise<DatapointResponse> => {
  const response = await api.get<DatapointResponse>('/datapoint', {
    params: {
      start_date: formatDate(startDate),
      end_date: formatDate(endDate),
      page,
      page_size: pageSize,
    },
  });
  return response.data;
};

export const getFilters = async (): Promise<FilterOptions> => {
  const response = await api.get<FilterOptions>('/filters');
  return response.data;
};

// New API functions for raw data and utilization

export const getRawAllotment = async (
  page: number = 1,
  pageSize: number = 50
): Promise<RawAllotmentResponse> => {
  const response = await api.get<RawAllotmentResponse>('/raw-allotment', {
    params: { page, page_size: pageSize },
  });
  return response.data;
};

export const getProgramsList = async (): Promise<{ data: ProgramItem[] }> => {
  const response = await api.get('/programs-list');
  return response.data;
};

export const getClientsList = async (): Promise<{ data: string[] }> => {
  const response = await api.get('/clients-list');
  return response.data;
};

export const getTrainerTypes = async (): Promise<{ data: TrainerTypeCount[] }> => {
  const response = await api.get('/trainer-types');
  return response.data;
};

export const getUtilizationByProgram = async (
  programs?: string[]
): Promise<UtilizationByProgramResponse> => {
  const params = arrayParams({ programs });
  const response = await api.get(`/utilization/by-program?${params}`);
  return response.data;
};

export const getUtilizationByClient = async (
  clients?: string[],
  startDate?: Date | null,
  endDate?: Date | null
): Promise<UtilizationByClientResponse> => {
  const params = arrayParams({
    clients,
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
  });
  const response = await api.get(`/utilization/by-client?${params}`);
  return response.data;
};

export const getUtilizationByDate = async (
  startDate?: Date | null,
  endDate?: Date | null,
  clients?: string[],
  programs?: string[]
): Promise<UtilizationByDateResponse> => {
  const params = arrayParams({
    start_date: formatDate(startDate),
    end_date: formatDate(endDate),
    clients,
    programs,
  });
  const response = await api.get(`/utilization/by-date?${params}`);
  return response.data;
};

export const getUtilizationByTrainer = async (
  targetDate?: Date | null
): Promise<UtilizationByTrainerResponse> => {
  const response = await api.get<UtilizationByTrainerResponse>('/utilization/by-trainer', {
    params: {
      target_date: formatDate(targetDate),
    },
  });
  return response.data;
};

// ==================== SharePoint API ====================

export const getSharePointStatus = async (): Promise<SharePointStatus> => {
  const response = await api.get<SharePointStatus>('/sharepoint/status');
  return response.data;
};

export const connectSharePoint = async (): Promise<SharePointConnectionResponse> => {
  const response = await api.post<SharePointConnectionResponse>('/sharepoint/connect');
  return response.data;
};

export const refreshSharePointData = async (): Promise<SharePointRefreshResponse> => {
  const response = await api.post<SharePointRefreshResponse>('/sharepoint/refresh');
  return response.data;
};

export const disconnectSharePoint = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/sharepoint/disconnect');
  return response.data;
};

export const startAutoRefresh = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/sharepoint/auto-refresh/start');
  return response.data;
};

export const stopAutoRefresh = async (): Promise<{ success: boolean; message: string }> => {
  const response = await api.post('/sharepoint/auto-refresh/stop');
  return response.data;
};
