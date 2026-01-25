import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import UploadModal from '../../components/modals/UploadModal';

interface TrainingLayoutProps {
  children: ReactNode;
}

export default function TrainingLayout({ children }: TrainingLayoutProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar onUploadClick={() => setIsUploadModalOpen(true)} />
      
      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
    </div>
  );
}
