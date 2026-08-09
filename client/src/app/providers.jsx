import { AuthProvider } from "@/features/auth/auth.context.jsx";
import { WorkspaceProvider } from "@/store/workspace.context.jsx";

export default function AppProviders({ children }) {
  return (
    <AuthProvider>
      <WorkspaceProvider>{children}</WorkspaceProvider>
    </AuthProvider>
  );
}
