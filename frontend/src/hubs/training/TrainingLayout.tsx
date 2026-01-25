import { ReactNode } from 'react';
// import { useState } from 'react'; // Uncomment for local dev with upload
import Sidebar from './Sidebar';
// import UploadModal from '../../components/modals/UploadModal'; // Uncomment for local dev

interface TrainingLayoutProps {
  children: ReactNode;
}

export default function TrainingLayout({ children }: TrainingLayoutProps) {
  // const [isUploadModalOpen, setIsUploadModalOpen] = useState(false); // Uncomment for local dev

  return (
    <div className="min-h-screen bg-gray-50">
      {/* For local dev with upload: <Sidebar onUploadClick={() => setIsUploadModalOpen(true)} /> */}
      <Sidebar />
      
      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-4 sm:px-6 lg:px-8 py-8 pt-16 lg:pt-8">
          {children}
        </div>
      </main>

      {/* Upload Modal - Uncomment for local dev
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />
      */}
    </div>
  );
}
