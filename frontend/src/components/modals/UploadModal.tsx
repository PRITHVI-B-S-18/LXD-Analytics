import { useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, FileSpreadsheet } from 'lucide-react';
import { uploadFile } from '../../services/api';
import type { UploadResponse } from '../../types';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  }, []);

  const handleUpload = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setResult({ success: false, error: 'Please upload an Excel file (.xlsx or .xls)' });
      return;
    }

    setIsUploading(true);
    setResult(null);

    try {
      const response = await uploadFile(file);
      setResult(response);
      if (response.success) {
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to upload file. Please try again.' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={handleClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Upload Excel File</h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
                <p className="mt-4 text-sm text-gray-600">Uploading and processing...</p>
              </div>
            ) : result ? (
              <div className="flex flex-col items-center">
                {result.success ? (
                  <>
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <p className="mt-4 text-sm font-medium text-green-600">Upload successful!</p>
                    <p className="mt-2 text-xs text-gray-500">
                      Loaded: {result.sheets_loaded?.join(', ')}
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-12 w-12 text-red-500" />
                    <p className="mt-4 text-sm font-medium text-red-600">{result.error}</p>
                  </>
                )}
              </div>
            ) : (
              <>
                <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
                <p className="mt-4 text-sm text-gray-600">
                  <label className="text-primary-600 hover:text-primary-500 cursor-pointer font-medium">
                    Click to upload
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      className="sr-only"
                    />
                  </label>
                  {' '}or drag and drop
                </p>
                <p className="mt-2 text-xs text-gray-500">Excel files only (.xlsx, .xls)</p>
              </>
            )}
          </div>

          {/* Expected Format Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-900 mb-2">Expected Sheets:</h3>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• <strong>Allotment Data</strong> - Programs and trainer assignments</li>
              <li>• <strong>Trainer Data</strong> - Trainer directory</li>
              <li>• <strong>Datapoint/Calculation</strong> - Pre-processed data (optional)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
