import { useAuth } from "@/features/auth/auth.context.jsx";
import Login from "@/features/auth/pages/Login.jsx";
import Dashboard from "@/features/dashboard/pages/Dashboard.jsx";

export default function App() {
  const { user } = useAuth();
  return user ? <Dashboard /> : <Login />;
}
