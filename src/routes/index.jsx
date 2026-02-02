import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from "../pages/auth/LoginPage.jsx";
import DashboardPage from "../pages/dashboard";
import TeamsPage from "../pages/teams";
import AppShell from "../layouts/app-shell";
import AuthGuard from "./auth-guard";
import ProjectDetailPage from '../pages/projects/detail';

export default function AppRoutes() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/login" element={<LoginPage />} />

                <Route
                    path="/"
                    element={
                        <AuthGuard>
                            <AppShell />
                        </AuthGuard>
                    }
                >
                    <Route index element={<DashboardPage />} />
                    <Route path="teams" element={<TeamsPage />} />
                    <Route path="projects/:id" element={<ProjectDetailPage />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}
