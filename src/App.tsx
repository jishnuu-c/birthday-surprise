import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicSurprisePage } from './pages/PublicSurprisePage';
import { EditorPage } from './pages/EditorPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main public landing / sample page */}
        <Route path="/" element={<PublicSurprisePage />} />

        {/* Public personalized recipient routes (e.g. /b/sophia-25th) */}
        <Route path="/b/:slug" element={<PublicSurprisePage />} />

        {/* Creator Studio & Admin Editor */}
        <Route path="/editor" element={<EditorPage />} />
        <Route path="/editor/:id" element={<EditorPage />} />

        {/* Multi-project dashboard */}
        <Route path="/dashboard" element={<DashboardPage />} />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
