import { ReactNode, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import UploadModal from '../../components/modals/UploadModal';
import SharePointModal from '../../components/modals/SharePointModal';

interface TrainingLayoutProps {
  children: ReactNode;
}

export default function TrainingLayout({ children }: TrainingLayoutProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isSharePointModalOpen, setIsSharePointModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDataLoaded = useCallback(() => {
    // Trigger a refresh of child components by updating key
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar 
        onUploadClick={() => setIsUploadModalOpen(true)} 
        onConnectClick={() => setIsSharePointModalOpen(true)}
      />
      
      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8" key={refreshKey}>
          {children}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* SharePoint Modal */}
      <SharePointModal
        isOpen={isSharePointModalOpen}
        onClose={() => setIsSharePointModalOpen(false)}
        onDataLoaded={handleDataLoaded}
      />
    </div>
  );
}
