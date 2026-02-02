import { Navigate, Route, Routes } from 'react-router-dom';
import Guard from '../components/common/Guard';

import LoginPage from '../pages/auth/LoginPage.jsx';
import TeamSwitchPage from '../pages/team/TeamSwitchPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import ProjectDetailPage from '../pages/project/ProjectDetailPage';
import TeamSettingsPage from '../pages/settings/TeamSettingsPage';

export default function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            <Route path="/login" element={<LoginPage />} />

            <Route
                path="/teams"
                element={
                    <Guard requireTeam={false}>
                        <TeamSwitchPage />
                    </Guard>
                }
            />

            <Route
                path="/dashboard"
                element={
                    <Guard>
                        <DashboardPage />
                    </Guard>
                }
            />

            <Route
                path="/projects/:id"
                element={
                    <Guard>
                        <ProjectDetailPage />
                    </Guard>
                }
            />

            <Route
                path="/settings/team"
                element={
                    <Guard>
                        <TeamSettingsPage />
                    </Guard>
                }
            />
        </Routes>
    );
}
