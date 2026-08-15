/**
 * What the signed-in person may do, for deciding what to render.
 *
 * ── This is not access control ───────────────────────────────────────────────
 * Worth stating at the top because it is the mistake this hook invites. Hiding
 * a button stops nobody: the tRPC endpoint is one fetch away and anyone can
 * call it. Every rule enforced here is ALSO enforced on the server, in
 * `_core/trpc.ts`, and the server is the only place that counts.
 *
 * What this is for is honesty. A viewer who can see a Save button and gets an
 * error when they press it has been lied to; a viewer who never sees it
 * understands their account. Same for an unreleased feature — a button that
 * 404s is worse than no button.
 *
 * So: use it to shape the UI, never to protect anything.
 */
import { trpc } from "@/lib/trpc";
import type { Capability, CompanyRole } from "@shared/permissions";

export type CompanyAccess = {
  loading: boolean;
  companyId: number | null;
  /** The signed-in person's own user id, for "is this row me?" checks. */
  userId: number | null;
  companyName: string;
  role: CompanyRole | null;
  isOwner: boolean;
  /** May this person do this? False while loading — fail closed on screen too. */
  can: (capability: Capability) => boolean;
  /** Is this feature available to them? False while loading. */
  hasFeature: (feature: string) => boolean;
};

export function useCompany(): CompanyAccess {
  const { data, isLoading } = trpc.company.me.useQuery(undefined, {
    // Access changes rarely and every screen asks. Refetching on focus keeps a
    // suspended or demoted member from working against a stale UI for long,
    // without a poll.
    staleTime: 60_000,
    refetchOnWindowFocus: true,
  });

  const capabilities = data?.capabilities ?? [];
  const features = data?.features ?? [];

  return {
    loading: isLoading,
    companyId: data?.companyId ?? null,
    userId: data?.userId ?? null,
    companyName: data?.companyName ?? "",
    role: (data?.role as CompanyRole | undefined) ?? null,
    isOwner: data?.isOwner ?? false,
    // Absent data means "no", not "yes". A brief flash of a button someone
    // cannot use is the small version of the same lie.
    can: capability => capabilities.includes(capability),
    hasFeature: feature => (features as string[]).includes(feature),
  };
}
