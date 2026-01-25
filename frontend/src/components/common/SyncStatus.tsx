import { useState, useEffect } from 'react';
import { RefreshCw, Cloud, CloudOff, Check, AlertCircle } from 'lucide-react';
import { getStatus, refreshSharePointData } from '../../services/api';
import { formatDisplayDate } from '../../utils';

export default function SyncStatus() {
  const [status, setStatus] = useState<{
    is_connected: boolean;
    auto_refresh_enabled: boolean;
    last_sync: string | null;
    file_name: string | null;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const response = await getStatus();
      if (response.sharepoint) {
        setStatus({
          is_connected: response.sharepoint.is_connected,
          auto_refresh_enabled: response.sharepoint.auto_refresh_enabled,
          last_sync: response.sharepoint.last_sync,
          file_name: response.sharepoint.file_name,
        });
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Refresh status every 30 seconds
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    setMessage(null);
    try {
      const result = await refreshSharePointData();
      if (result.success) {
        setMessage({ type: 'success', text: 'Data synced successfully!' });
        fetchStatus();
        // Reload the page to show new data
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        setMessage({ type: 'error', text: result.message || 'Sync failed' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to sync data' });
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastSync = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDisplayDate(dateStr);
  };

  if (!status) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Message Toast */}
      {message && (
        <div
          className={`mb-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
        >
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-3 min-w-[240px]">
        <div className="flex items-center justify-between gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            {status.is_connected ? (
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Cloud size={16} className="text-green-600" />
              </div>
            ) : (
              <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                <CloudOff size={16} className="text-gray-400" />
              </div>
            )}
            <div>
              <p className="text-xs font-medium text-gray-900">
                {status.is_connected ? 'SharePoint Connected' : 'Not Connected'}
              </p>
              <p className="text-[10px] text-gray-500">
                {status.is_connected
                  ? `Synced ${formatLastSync(status.last_sync)}`
                  : 'Upload data to start'}
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          {status.is_connected && (
            <button
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-primary-50 text-primary-600 hover:bg-primary-100 transition-colors disabled:opacity-50"
              title="Sync now"
            >
              <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
            </button>
          )}
        </div>

        {/* Auto-refresh indicator */}
        {status.is_connected && status.auto_refresh_enabled && (
          <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] text-gray-500">Auto-sync enabled (every 5 min)</span>
          </div>
        )}
      </div>
    </div>
  );
}
