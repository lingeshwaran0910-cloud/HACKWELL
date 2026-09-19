import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';

import { CommandCenterPage } from './pages/CommandCenterPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { IntelligencePage } from './pages/IntelligencePage';
import { SimulationPage } from './pages/SimulationPage';
import { SystemActivityPage } from './pages/SystemActivityPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<CommandCenterPage />} />
          <Route path="/incidents" element={<IncidentsPage />} />
          <Route path="/map" element={<LiveMapPage />} />
          <Route path="/resources" element={<ResourcesPage />} />
          <Route path="/hospitals" element={<HospitalsPage />} />
          <Route path="/intelligence" element={<IntelligencePage />} />
          <Route path="/simulation" element={<SimulationPage />} />
          <Route path="/activity" element={<SystemActivityPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
};

export default App;
