import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/features/auth/auth.context.jsx";
import Login from "@/features/auth/pages/Login.jsx";
import ForgotPassword from "@/features/auth/pages/ForgotPassword.jsx";
import ResetPassword from "@/features/auth/pages/ResetPassword.jsx";
import Dashboard from "@/features/dashboard/pages/Dashboard.jsx";
import AdminShell from "@/components/AdminShell.jsx";
import AdminSettings from "@/components/AdminSettings.jsx";
import AdminDashboard from "@/features/admin/pages/AdminDashboard.jsx";
import LayoutsPage from "@/features/layouts/pages/LayoutsPage.jsx";
import LayoutEditor from "@/features/layouts/pages/LayoutEditor.jsx";
import TileAdmin from "@/features/admin/pages/TileAdmin.jsx";

function Splash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-400">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/30 border-t-slate-400" />
        Checking session…
      </div>
    </div>
  );
}

function LayoutEditorPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  return <LayoutEditor layoutId={layoutId} onClose={() => navigate("/admin/layouts")} />;
}

function PublicRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

function ProtectedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/admin" element={<AdminShell />}>
        <Route index element={<Navigate to="/admin/layouts" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="layouts" element={<LayoutsPage />} />
        <Route path="layouts/:layoutId" element={<LayoutEditorPage />} />
        <Route path="tiles" element={<TileAdmin />} />
        <Route path="settings" element={<AdminSettings inline />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <Splash />;

  return (
    <BrowserRouter>
      {user ? <ProtectedRoutes /> : <PublicRoutes />}
    </BrowserRouter>
  );
}
