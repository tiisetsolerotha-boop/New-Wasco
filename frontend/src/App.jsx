import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

import LandingPage   from './pages/Landing';
import LoginPage     from './pages/Login';
import RegisterPage  from './pages/Register';
import DashboardPage from './pages/Dashboard';
import BillsPage     from './pages/Bills';
import UsagePage     from './pages/Usage';
import PaymentsPage  from './pages/Payments';
import LeakagesPage  from './pages/Leakages';
import CustomersPage from './pages/Customers';
import ReportsPage   from './pages/Reports';
import RatesPage     from './pages/Rates';
import ProfilePage   from './pages/Profile';
import PublicServices from './pages/PublicServices';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/services" element={<PublicRoute><PublicServices /></PublicRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/bills"     element={<ProtectedRoute><BillsPage /></ProtectedRoute>} />
      <Route path="/usage"     element={<ProtectedRoute><UsagePage /></ProtectedRoute>} />
      <Route path="/payments"  element={<ProtectedRoute><PaymentsPage /></ProtectedRoute>} />
      <Route path="/leakages"  element={<ProtectedRoute><LeakagesPage /></ProtectedRoute>} />
      <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />

      <Route path="/customers" element={<ProtectedRoute roles={['admin','branch_manager']}><CustomersPage /></ProtectedRoute>} />
      <Route path="/reports"   element={<ProtectedRoute roles={['admin','branch_manager']}><ReportsPage /></ProtectedRoute>} />
      <Route path="/rates"     element={<ProtectedRoute roles={['admin']}><RatesPage /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { background: '#1a2236', color: '#f1f5f9', border: '1px solid rgba(255,255,255,0.1)' },
            success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
            error:   { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
