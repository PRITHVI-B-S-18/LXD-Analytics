import { Routes, Route, Navigate } from 'react-router-dom';
import { HubSelector } from './pages';
import {
  TrainingLayout,
  Dashboard,
  PendingAllotments,
  Utilization,
  ByProgram,
  ByClient,
  ByDate,
  ByTrainer,
  Programs,
  Trainers,
  TrainerDeployment,
  DataExplorer,
} from './hubs/training';

// Placeholder components for future hubs
const DeliveryHubPlaceholder = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">🚚</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Delivery Hub</h1>
      <p className="text-gray-500 mb-6">Coming Soon</p>
      <a href="/" className="text-emerald-600 hover:text-emerald-700 font-medium">
        ← Back to Hub Selector
      </a>
    </div>
  </div>
);

const OpsHubPlaceholder = () => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <div className="text-center">
      <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <span className="text-4xl">⚙️</span>
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops Hub</h1>
      <p className="text-gray-500 mb-6">Coming Soon</p>
      <a href="/" className="text-amber-600 hover:text-amber-700 font-medium">
        ← Back to Hub Selector
      </a>
    </div>
  </div>
);

function App() {
  return (
    <Routes>
      {/* Hub Selector - Landing Page */}
      <Route path="/" element={<HubSelector />} />
      
      {/* Training Hub */}
      <Route path="/training/*" element={
        <TrainingLayout>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="pending" element={<PendingAllotments />} />
            <Route path="utilization" element={<Utilization />}>
              <Route index element={<Navigate to="/training/utilization/program" replace />} />
              <Route path="program" element={<ByProgram />} />
              <Route path="client" element={<ByClient />} />
              <Route path="date" element={<ByDate />} />
              <Route path="trainer" element={<ByTrainer />} />
            </Route>
            <Route path="programs" element={<Programs />} />
            <Route path="trainers" element={<Trainers />} />
            <Route path="trainer-calendar" element={<TrainerDeployment />} />
            <Route path="data-explorer" element={<DataExplorer />} />
          </Routes>
        </TrainingLayout>
      } />
      
      {/* Delivery Hub - Placeholder */}
      <Route path="/delivery/*" element={<DeliveryHubPlaceholder />} />
      
      {/* Ops Hub - Placeholder */}
      <Route path="/ops/*" element={<OpsHubPlaceholder />} />
    </Routes>
  );
}

export default App;
