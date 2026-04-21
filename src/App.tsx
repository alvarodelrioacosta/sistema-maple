// =============================================
// APP - Root component with routing
// =============================================

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout';
import { AuthProvider, useAuth } from './context/AuthContext';
import './pages/Login/Unauthorized.css';
import {
    Dashboard,
    Accounts,
    Characters,
    Items,
    Resources,
    Clients,
    AccountsReceivable,
    ItemsDB,
    Settings,
    CubingHistory,
    Tasks,
    Overview,
    Events,
    Login,
    Bosses,
    MysticFrontierPage,
} from './pages';

const ProtectedRoute: React.FC<{ children: React.ReactElement; adminOnly?: boolean }> = ({ children, adminOnly }) => {
    const { user, profile, loading } = useAuth();

    if (loading) return <div className="loading-screen">Cargando...</div>;
    if (!user) return <Navigate to="/login" />;

    // Si el usuario no está autorizado por el admin
    if (profile?.role === 'unauthorized') {
        return (
            <div className="unauthorized-page">
                <div className="unauthorized-card">
                    <h1>Acceso Pendiente</h1>
                    <p>Tu cuenta ha sido registrada correctamente, pero aún no tienes un rol asignado.</p>
                    <p>Por favor, contacta con el administrador para que autorice tu acceso.</p>
                    <button className="logout-link" onClick={() => window.location.reload()}>Reintentar</button>
                </div>
            </div>
        );
    }

    if (adminOnly && profile?.role !== 'admin') {
        return <Navigate to="/overview" />;
    }

    return children;
};

function AppRoutes() {
    const { user, profile } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={!user ? <Login /> : <Navigate to={profile?.role === 'worker' ? '/overview' : '/'} />} />

            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
                <Route index element={<ProtectedRoute adminOnly><Dashboard /></ProtectedRoute>} />
                <Route path="overview" element={<Overview />} />

                {/* Admin Only Routes */}
                <Route path="accounts" element={<ProtectedRoute adminOnly><Accounts /></ProtectedRoute>} />
                <Route path="characters" element={<ProtectedRoute adminOnly><Characters /></ProtectedRoute>} />
                <Route path="items" element={<ProtectedRoute adminOnly><Items /></ProtectedRoute>} />
                <Route path="resources" element={<ProtectedRoute adminOnly><Resources /></ProtectedRoute>} />
                <Route path="clients" element={<ProtectedRoute adminOnly><Clients /></ProtectedRoute>} />
                <Route path="accounts-receivable" element={<ProtectedRoute adminOnly><AccountsReceivable /></ProtectedRoute>} />
                <Route path="items-db" element={<ProtectedRoute adminOnly><ItemsDB /></ProtectedRoute>} />
                <Route path="cubing-history" element={<ProtectedRoute adminOnly><CubingHistory /></ProtectedRoute>} />
                <Route path="events" element={<ProtectedRoute adminOnly><Events /></ProtectedRoute>} />
                <Route path="tasks" element={<ProtectedRoute adminOnly><Tasks /></ProtectedRoute>} />
                <Route path="bosses" element={<ProtectedRoute adminOnly><Bosses /></ProtectedRoute>} />
                <Route path="mystic-frontier" element={<ProtectedRoute adminOnly><MysticFrontierPage /></ProtectedRoute>} />
                <Route path="settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            </Route>
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <AppRoutes />
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
