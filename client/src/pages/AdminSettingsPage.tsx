import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Shield,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import EarlyAccessSignups from "@/components/EarlyAccessSignups";

// ─── Feature Flag Row ─────────────────────────────────────────────────────────

function FeatureFlagRow({
  flag,
  onToggle,
  isUpdating,
}: {
  flag: {
    id: number;
    flagKey: string;
    label: string;
    description: string | null;
    enabledForContractors: boolean;
    updatedAt: Date;
  };
  onToggle: (flagKey: string, newValue: boolean) => void;
  isUpdating: boolean;
}) {
  const enabled = flag.enabledForContractors;

  return (
    <div className="flex items-start gap-4 px-5 py-4 border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{flag.label}</span>
          <Badge
            variant={enabled ? "default" : "outline"}
            className={`text-xs ${enabled ? "bg-green-500/20 text-green-400 border-green-500/30" : "text-muted-foreground"}`}
          >
            {enabled ? "ON" : "OFF"}
          </Badge>
        </div>
        {flag.description && (
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {flag.description}
          </p>
        )}
        <p className="text-xs text-muted-foreground/60 mt-1">
          Key:{" "}
          <code className="font-mono bg-muted px-1 rounded text-xs">
            {flag.flagKey}
          </code>
          {" · "}Updated: {new Date(flag.updatedAt).toLocaleDateString()}
        </p>
      </div>

      <button
        disabled={isUpdating}
        onClick={() => onToggle(flag.flagKey, !enabled)}
        className={`shrink-0 transition-all duration-200 ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105"}`}
        aria-label={`Toggle ${flag.label}`}
      >
        {enabled ? (
          <ToggleRight className="w-9 h-9 text-green-500" />
        ) : (
          <ToggleLeft className="w-9 h-9 text-muted-foreground" />
        )}
      </button>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);

  const {
    data: flags = [],
    refetch,
    isLoading,
  } = trpc.featureFlags.getAll.useQuery();

  const upsertFlag = trpc.featureFlags.upsert.useMutation({
    onSuccess: () => {
      refetch();
      setUpdatingKey(null);
      toast.success("Feature flag updated");
    },
    onError: e => {
      setUpdatingKey(null);
      toast.error(e.message);
    },
  });

  // Guard — only admins should ever reach this page, but double-check
  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-6">
        <AlertTriangle className="w-12 h-12 text-destructive/60" />
        <p className="text-lg font-semibold">Access Denied</p>
        <p className="text-sm text-muted-foreground">
          This page is restricted to administrators.
        </p>
      </div>
    );
  }

  const handleToggle = (flagKey: string, newValue: boolean) => {
    const flag = flags.find(f => f.flagKey === flagKey);
    if (!flag) return;
    setUpdatingKey(flagKey);
    upsertFlag.mutate({
      flagKey: flag.flagKey,
      label: flag.label,
      description: flag.description ?? undefined,
      enabledForContractors: newValue,
    });
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">Admin Settings</h1>
            <p className="text-xs text-muted-foreground">
              Manage feature access and system configuration
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Early access — first, because it is the one section here with new
            information in it on any given day. */}
        <EarlyAccessSignups />

        {/* Feature Flags section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">Feature Flags</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Control which features are visible to the{" "}
                <strong>Contractor</strong> role. Admins always have full access
                regardless of these settings.
              </p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs"
              onClick={() => refetch()}
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                Loading flags…
              </div>
            ) : flags.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                No feature flags configured yet.
              </div>
            ) : (
              flags.map(flag => (
                <FeatureFlagRow
                  key={flag.flagKey}
                  flag={flag}
                  onToggle={handleToggle}
                  isUpdating={updatingKey === flag.flagKey}
                />
              ))
            )}
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            Changes take effect immediately — contractors will see the updated
            state on their next page load.
          </p>
        </div>

        {/* Role info section */}
        <div>
          <h2 className="text-sm font-semibold mb-3">Role Reference</h2>
          <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            <div className="px-5 py-3 flex items-start gap-3">
              <Badge className="bg-primary/20 text-primary border-primary/30 shrink-0 mt-0.5">
                admin
              </Badge>
              <div>
                <p className="text-xs font-medium">Administrator</p>
                <p className="text-xs text-muted-foreground">
                  Full access to all features, settings, and admin pages.
                  Feature flags do not apply.
                </p>
              </div>
            </div>
            <div className="px-5 py-3 flex items-start gap-3">
              <Badge variant="outline" className="shrink-0 mt-0.5">
                contractor
              </Badge>
              <div>
                <p className="text-xs font-medium">Contractor (public user)</p>
                <p className="text-xs text-muted-foreground">
                  Access to all standard features. Feature flags control
                  visibility of beta/premium features.
                </p>
              </div>
            </div>
            <div className="px-5 py-3 flex items-start gap-3">
              <Badge
                variant="outline"
                className="text-muted-foreground shrink-0 mt-0.5"
              >
                user
              </Badge>
              <div>
                <p className="text-xs font-medium">User (legacy)</p>
                <p className="text-xs text-muted-foreground">
                  Legacy role, treated identically to Contractor. New signups
                  default to this role.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Signed-in admin info */}
        <div className="rounded-xl border border-border bg-card px-5 py-4">
          <p className="text-xs text-muted-foreground">
            Signed in as{" "}
            <strong className="text-foreground">
              {user?.email ?? user?.name}
            </strong>{" "}
            <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">
              admin
            </Badge>
          </p>
        </div>
      </div>
    </div>
  );
}
