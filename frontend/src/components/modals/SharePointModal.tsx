import { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  Play,
  Square,
  Clock,
  FileSpreadsheet,
  Link2,
} from 'lucide-react';
import { 
  connectSharePoint, 
  disconnectSharePoint, 
  refreshSharePointData,
  startAutoRefresh,
  stopAutoRefresh,
  getStatus,
} from '../../services/api';
import type { SharePointStatus } from '../../types';
import { formatDisplayDate } from '../../utils';

interface SharePointModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded?: () => void;
}

export default function SharePointModal({ isOpen, onClose, onDataLoaded }: SharePointModalProps) {
  const [status, setStatus] = useState<SharePointStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch status on mount and periodically
  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      const interval = setInterval(fetchStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const fetchStatus = async () => {
    try {
      const statusData = await getStatus();
      setStatus(statusData.sharepoint || null);
    } catch (err) {
      console.error('Failed to fetch SharePoint status:', err);
    }
  };

  const handleConnect = async () => {
    setActionLoading('connect');
    setError(null);
    setSuccessMessage(null);
    
    try {
      const result = await connectSharePoint();
      if (result.success) {
        setSuccessMessage(result.message);
        await fetchStatus();
        onDataLoaded?.();
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Connection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDisconnect = async () => {
    setActionLoading('disconnect');
    setError(null);
    
    try {
      await disconnectSharePoint();
      setSuccessMessage('Disconnected from SharePoint');
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Disconnect failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefresh = async () => {
    setActionLoading('refresh');
    setError(null);
    
    try {
      const result = await refreshSharePointData();
      if (result.success) {
        setSuccessMessage(`Data refreshed! (${result.data?.allotment_rows || 0} allotment rows)`);
        await fetchStatus();
        onDataLoaded?.();
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Refresh failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleAutoRefresh = async () => {
    setActionLoading('autorefresh');
    setError(null);
    
    try {
      if (status?.auto_refresh_enabled) {
        await stopAutoRefresh();
        setSuccessMessage('Auto-refresh stopped');
      } else {
        await startAutoRefresh();
        setSuccessMessage(`Auto-refresh started (every ${status?.refresh_interval_seconds || 300}s)`);
      }
      await fetchStatus();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to toggle auto-refresh');
    } finally {
      setActionLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-black/50 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <Cloud size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">SharePoint Connection</h2>
                <p className="text-sm text-gray-500">Connect to live Excel data</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl">
                <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            )}

            {successMessage && (
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-100 rounded-xl">
                <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">{successMessage}</p>
              </div>
            )}

            {/* Connection Status */}
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-gray-700">Status</span>
                {status?.is_connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    Connected
                  </span>
                ) : status?.is_configured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium">
                    <CloudOff size={14} />
                    Not Connected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm font-medium">
                    Not Configured
                  </span>
                )}
              </div>

              {/* File Info */}
              {status?.is_configured && (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet size={16} className="text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">File</p>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {status.file_name || 'Not set'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Link2 size={16} className="text-gray-400" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500">Site</p>
                      <p className="text-sm text-gray-700 truncate">
                        {status.site_url || 'Not set'}
                      </p>
                    </div>
                  </div>

                  {status.last_sync && (
                    <div className="flex items-center gap-3">
                      <Clock size={16} className="text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Last Sync</p>
                        <p className="text-sm text-gray-700">
                          {formatDisplayDate(status.last_sync)} at{' '}
                          {new Date(status.last_sync).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  )}

                  {status.last_error && !status.is_connected && (
                    <div className="flex items-start gap-3 mt-2 p-3 bg-red-50 rounded-lg">
                      <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-red-600">{status.last_error}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Auto-Refresh Toggle */}
            {status?.is_connected && (
              <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-indigo-900">Auto-Refresh</p>
                  <p className="text-xs text-indigo-600">
                    Updates every {Math.round((status.refresh_interval_seconds || 300) / 60)} minutes
                  </p>
                </div>
                <button
                  onClick={handleToggleAutoRefresh}
                  disabled={actionLoading === 'autorefresh'}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    status.auto_refresh_enabled
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  {actionLoading === 'autorefresh' ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : status.auto_refresh_enabled ? (
                    <>
                      <Square size={14} />
                      Stop
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Start
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 rounded-b-2xl">
            <div className="flex items-center justify-between">
              {status?.is_connected ? (
                <>
                  <button
                    onClick={handleDisconnect}
                    disabled={!!actionLoading}
                    className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Disconnect
                  </button>
                  <button
                    onClick={handleRefresh}
                    disabled={!!actionLoading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'refresh' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    Refresh Now
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConnect}
                    disabled={!!actionLoading || !status?.is_configured}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl text-sm font-medium hover:from-blue-600 hover:to-indigo-700 transition-all disabled:opacity-50"
                  >
                    {actionLoading === 'connect' ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Cloud size={16} />
                    )}
                    Connect to SharePoint
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
