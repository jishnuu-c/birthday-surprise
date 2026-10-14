import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { PublicSurprisePage } from './pages/PublicSurprisePage';

const EditorPage = lazy(() => import('./pages/EditorPage').then(m => ({ default: m.EditorPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })));

const RouteLoadingFallback: React.FC = () => (
  <div className="min-h-screen bg-[#160D1F] flex items-center justify-center text-[#E8C982]">
    <div className="w-8 h-8 rounded-full border-2 border-[#E8C982] border-t-transparent animate-spin" />
  </div>
);

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteLoadingFallback />}>
          <Routes>
            {/* Main public landing / sample page */}
            <Route path="/" element={<PublicSurprisePage />} />

            {/* Public personalized recipient routes (e.g. /b/sophia-25th) */}
            <Route path="/b/:slug" element={<PublicSurprisePage />} />
            <Route path="/p/:slug" element={<PublicSurprisePage />} />

            {/* Creator Studio & Admin Editor */}
            <Route path="/editor" element={<EditorPage />} />
            <Route path="/editor/:id" element={<EditorPage />} />

            {/* Multi-project / Admin dashboard */}
            <Route path="/admin" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />

            {/* 404 Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
