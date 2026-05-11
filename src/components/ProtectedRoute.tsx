import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  requiredRole?: "business" | "admin";
  blockRoles?: string[];
}

export default function ProtectedRoute({ children, requiredRole, blockRoles = [] }: Props) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role && blockRoles.includes(role)) {
    return <Navigate to={role === "admin" ? "/admin" : "/dashboard"} replace />;
  }

  if (requiredRole === "admin" && role !== "admin") {
    return <Navigate to={role === "business" ? "/dashboard" : "/profile"} replace />;
  }

  if (requiredRole === "business" && role !== "business" && role !== "admin") {
    return <Navigate to="/profile" replace />;
  }

  return <>{children}</>;
}
