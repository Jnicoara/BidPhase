import { useAuth } from "@/_core/hooks/useAuth";
import LoginPage from "@/pages/LoginPage";
import { Loader2 } from "lucide-react";

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * AuthGuard — wraps the entire app.
 * Shows a loading spinner while auth state is being fetched.
 * Shows the LoginPage if the user is not authenticated.
 * Renders children when authenticated.
 */
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, refresh } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-[#F5C518]" />
          <p className="text-sm text-muted-foreground">Loading HelixBid…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onSuccess={() => refresh()} />;
  }

  return <>{children}</>;
}
