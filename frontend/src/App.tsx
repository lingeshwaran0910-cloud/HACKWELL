import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';

import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { LiveInputsPage } from './pages/LiveInputsPage';
import { IncidentsPage } from './pages/IncidentsPage';
import { LiveMapPage } from './pages/LiveMapPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { HospitalsPage } from './pages/HospitalsPage';
import { IntelligencePage } from './pages/IntelligencePage';
import { VideoAnalysisPage } from './pages/VideoAnalysisPage';
import { SimulationPage } from './pages/SimulationPage';
import { SystemActivityPage } from './pages/SystemActivityPage';
import { ReportEmergencyPage } from './pages/ReportEmergencyPage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppProvider>
        <BrowserRouter>
          <AppShell>
            <Routes>
              {/* Public Unauthenticated Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/report-emergency" element={<ReportEmergencyPage />} />
              <Route path="/report" element={<ReportEmergencyPage />} />

              {/* Protected Officer Operational Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <CommandCenterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/inputs"
                element={
                  <ProtectedRoute>
                    <LiveInputsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents"
                element={
                  <ProtectedRoute>
                    <IncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/incidents/:incidentId"
                element={
                  <ProtectedRoute>
                    <IncidentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/map"
                element={
                  <ProtectedRoute>
                    <LiveMapPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/resources"
                element={
                  <ProtectedRoute>
                    <ResourcesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hospitals"
                element={
                  <ProtectedRoute>
                    <HospitalsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/intelligence"
                element={
                  <ProtectedRoute>
                    <IntelligencePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/video-analysis"
                element={
                  <ProtectedRoute>
                    <VideoAnalysisPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/simulation"
                element={
                  <ProtectedRoute>
                    <SimulationPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/activity"
                element={
                  <ProtectedRoute>
                    <SystemActivityPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AppShell>
        </BrowserRouter>
      </AppProvider>
    </AuthProvider>
  );
};

export default App;
