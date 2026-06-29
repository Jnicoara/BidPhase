import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "login" | "signup";

interface LoginPageProps {
  onSuccess?: () => void;
}

export default function LoginPage({ onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      onSuccess?.();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const signupMutation = trpc.auth.signup.useMutation({
    onSuccess: () => {
      utils.auth.me.invalidate();
      onSuccess?.();
    },
    onError: (err) => setErrorMsg(err.message),
  });

  const isPending = loginMutation.isPending || signupMutation.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else {
      signupMutation.mutate({ email, password, name: name || undefined });
    }
  };

  const toggleMode = () => {
    setMode((m) => (m === "login" ? "signup" : "login"));
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background grid pattern */}
      <div
        className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(245,197,24,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,197,24,0.5) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={28} className="text-[#F5C518]" />
            <span
              className="text-3xl font-bold tracking-tight"
              style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            >
              <span className="text-foreground">Bid</span>
              <span className="text-[#F5C518]">Phase</span>
            </span>
          </div>
          <p className="text-muted-foreground text-sm text-center">
            Electrical estimating for the field
          </p>
        </div>

        <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">
              {mode === "login" ? "Sign in to your account" : "Create your account"}
            </CardTitle>
            <CardDescription>
              {mode === "login"
                ? "Enter your email and password to continue."
                : "Start estimating in seconds. No credit card required."}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {mode === "signup" && (
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    disabled={isPending}
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete={mode === "login" ? "username" : "email"}
                  disabled={isPending}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={mode === "signup" ? 8 : 1}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    disabled={isPending}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-0">
              <Button
                type="submit"
                className={cn(
                  "w-full font-semibold",
                  "bg-[#F5C518] hover:bg-[#F5C518]/90 text-black"
                )}
                disabled={isPending}
              >
                {isPending ? (
                  <><Loader2 size={16} className="animate-spin mr-2" /> Please wait…</>
                ) : mode === "login" ? (
                  "Sign In"
                ) : (
                  "Create Account"
                )}
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={toggleMode}
                  className="text-[#F5C518] hover:underline font-medium"
                  disabled={isPending}
                >
                  {mode === "login" ? "Sign up free" : "Sign in"}
                </button>
              </p>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Your data is private and never shared with other users.
        </p>
      </div>
    </div>
  );
}
