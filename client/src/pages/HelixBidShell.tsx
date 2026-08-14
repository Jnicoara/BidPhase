/**
 * HelixBidShell — Main layout shell
 * Desktop: fixed left sidebar (icon-only 64px, expands to 220px on hover)
 * Mobile:  fixed bottom navigation bar
 * Design: Tactical Dark Mode SaaS, Safety Yellow accent (#F5C518)
 *
 * Routing (hash-based):
 *   /           → HelixBid Homepage (BP logo destination)
 *   /dashboard  → Dashboard (all bids by status; replaced the Projects grid)
 *   /project/:id → Legacy project detail (PDF plan viewer / takeoff). Still
 *                  routed, but nothing links to it since Projects was removed.
 *   /settings    → Settings
 *   /trash       → Trash
 *   /matdb       → Supplier Pricing (prices the real materials catalog)
 *   /library/materials   → Materials (Foundation library catalog)
 *   /library/labor-rates → Labor Rates (roles and what they cost per hour)
 *   /library/modifiers   → Modifiers (job-condition labor adjustments)
 *   /library/assemblies  → Assembly Builder (materials + labor + modifiers)
 *   /bids                → Bids (Foundation bid layer; NOT legacy /projects)
 *   /quickbid            → Quick bid (keyboard counting entry onto the same bids)
 *   /admin       → Admin Settings (admin role only)
 */
import { useApp } from "@/contexts/AppContext";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import SettingsTab from "@/components/tabs/SettingsTab";
import MaterialDatabasePage from "@/pages/MaterialDatabasePage";
import TrashPage from "@/pages/TrashPage";
import HelixBidHomePage from "@/pages/HelixBidHomePage";
import DashboardPage from "@/pages/DashboardPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import AdminSettingsPage from "@/pages/AdminSettingsPage";
import MaterialsLibraryPage from "@/pages/MaterialsLibraryPage";
import LaborRatesPage from "@/pages/LaborRatesPage";
import ModifiersPage from "@/pages/ModifiersPage";
import AssembliesLibraryPage from "@/pages/AssembliesLibraryPage";
import BidsPage from "@/pages/BidsPage";
import QuickBidPage from "@/pages/QuickBidPage";
import TakeoffPage from "@/pages/TakeoffPage";
import ProposalPage from "@/pages/ProposalPage";
import BidArchivePage from "@/pages/BidArchivePage";
import KitsPage from "@/pages/KitsPage";
import ClientsPage from "@/pages/ClientsPage";
import FirstRunPage from "@/pages/FirstRunPage";
import { trpc } from "@/lib/trpc";
import {
  Settings,
  ChevronRight,
  Database,
  Package,
  Shield,
  Boxes,
  HardHat,
  SlidersHorizontal,
  Layers,
  FileText,
  Zap,
  LayoutDashboard,
  Archive as ArchiveIcon,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { APP_VERSION_LABEL } from "@shared/version";

type Route =
  | "home"
  | "dashboard"
  | "project-detail"
  | "settings"
  | "trash"
  | "matdb"
  | "library-materials"
  | "library-labor-rates"
  | "library-modifiers"
  | "library-assemblies"
  | "library-kits"
  | "bids"
  | "clients"
  | "quickbid"
  | "takeoff"
  | "proposal"
  | "bid-archive"
  | "welcome"
  | "admin";

// ── Path ↔ Route mapping ────────────────────────────────────────────────────
function pathToRoute(path: string): { route: Route; projectId?: number } {
  const full = path
    .replace(/^#\/?/, "")
    .replace(/^\//, "")
    .split("?")[0]
    .split("#")[0];
  const parts = full.split("/");
  const p = parts[0];

  if (p === "" || p === "home") return { route: "home" };
  // The Dashboard replaced the old Projects list. /projects still resolves so
  // existing links and bookmarks land somewhere sensible rather than on Home.
  if (p === "dashboard" || p === "projects") return { route: "dashboard" };
  if (p === "project" && parts[1]) {
    const id = parseInt(parts[1]);
    if (!isNaN(id)) return { route: "project-detail", projectId: id };
  }
  if (p === "matdb") return { route: "matdb" };
  if (p === "settings") return { route: "settings" };
  if (p === "trash") return { route: "trash" };
  // Foundation bid layer. Distinct from /projects, which is the legacy
  // master_* system with its PDF/takeoff state.
  // The archive of soft-deleted BIDS. Distinct from /trash, which belongs to
  // the legacy projects system and is client-state only.
  if (p === "archive") return { route: "bid-archive" };
  if (p === "bids") {
    // /bids/:id opens straight into one bid, which is what the Dashboard links to.
    const id = parts[1] ? parseInt(parts[1]) : NaN;
    if (isNaN(id)) return { route: "bids" };
    // /bids/:id/plans is the takeoff surface for that bid.
    if (parts[2] === "plans") return { route: "takeoff", projectId: id };
    // /bids/:id/proposal is the client-facing document for that bid.
    if (parts[2] === "proposal") return { route: "proposal", projectId: id };
    return { route: "bids", projectId: id };
  }
  if (p === "clients") return { route: "clients" };
  if (p === "quickbid") return { route: "quickbid" };
  if (p === "welcome") return { route: "welcome" };
  // Library § …. Bare /library lands on Materials; Assemblies is still to come.
  if (p === "library") {
    if (parts[1] === "labor-rates") return { route: "library-labor-rates" };
    if (parts[1] === "modifiers") return { route: "library-modifiers" };
    if (parts[1] === "assemblies") return { route: "library-assemblies" };
    if (parts[1] === "kits") return { route: "library-kits" };
    if (!parts[1] || parts[1] === "materials")
      return { route: "library-materials" };
  }
  if (p === "admin") return { route: "admin" };
  // Default: show homepage
  return { route: "home" };
}

function getCurrentRouteState(): { route: Route; projectId?: number } {
  const hash = window.location.hash;
  if (hash && hash.length > 1) return pathToRoute(hash);
  return pathToRoute(window.location.pathname);
}

export default function HelixBidShell() {
  const {
    activeTab,
    setActiveTab,
    uiFontScale,
    setShowMaterialList,
    activeCategory,
    setActiveCategory,
  } = useApp();

  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  // ── URL-based routing using hash ──────────────────────────────────────────
  const [routeState, setRouteState] = useState<{
    route: Route;
    projectId?: number;
  }>(() => getCurrentRouteState());
  const [previousRoute, setPreviousRoute] = useState<Route>("home");

  const { route, projectId: activeProjectId } = routeState;

  const navigate = useCallback((r: Route, id?: number) => {
    if (r === "home") {
      window.location.hash = "/home";
    } else if (r === "dashboard") {
      window.location.hash = "/dashboard";
    } else if (r === "bids" && id) {
      window.location.hash = `/bids/${id}`;
    } else if (r === "takeoff" && id) {
      window.location.hash = `/bids/${id}/plans`;
    } else if (r === "proposal" && id) {
      window.location.hash = `/bids/${id}/proposal`;
    } else if (r === "bid-archive") {
      window.location.hash = "/archive";
    } else if (r === "project-detail" && id) {
      window.location.hash = `/project/${id}`;
    } else if (r === "library-materials") {
      window.location.hash = "/library/materials";
    } else if (r === "library-labor-rates") {
      window.location.hash = "/library/labor-rates";
    } else if (r === "library-modifiers") {
      window.location.hash = "/library/modifiers";
    } else if (r === "library-assemblies") {
      window.location.hash = "/library/assemblies";
    } else if (r === "library-kits") {
      window.location.hash = "/library/kits";
    } else {
      window.location.hash = `/${r}`;
    }
  }, []);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate(previousRoute);
    }
  }, [navigate, previousRoute]);

  useEffect(() => {
    const onHashChange = () => {
      const state = getCurrentRouteState();
      setRouteState(prev => {
        setPreviousRoute(prev.route);
        return state;
      });
      if (state.route === "settings") setActiveTab("settings");
    };
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    onHashChange();
    return () => {
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
    };
  }, [setActiveTab]);

  // ── Derived state ──────────────────────────────────────────────────────────
  const isOnHome = route === "home";
  const isOnDashboard = route === "dashboard";
  const isOnProjectDetail = route === "project-detail";
  const isInSettings = route === "settings";
  const isInTrash = route === "trash";
  const isInMatDb = route === "matdb";
  const isInLibraryMats = route === "library-materials";
  const isInLaborRates = route === "library-labor-rates";
  const isInModifiers = route === "library-modifiers";
  const isInLibraryAsms = route === "library-assemblies";
  const isInLibraryKits = route === "library-kits";
  const isInBids = route === "bids";
  const isInClients = route === "clients";
  const isInTakeoff = route === "takeoff";
  const isInProposal = route === "proposal";
  const isInBidArchive = route === "bid-archive";
  const isInQuickBid = route === "quickbid";
  const isOnWelcome = route === "welcome";
  const isInAdmin = route === "admin";

  /**
   * Send a brand-new account to the welcome screen instead of the Dashboard.
   *
   * Only from the two landing routes. Redirecting from ANY route would trap a
   * new user who deliberately clicked into, say, Materials — and would fight
   * the welcome screen's own "start my first bid" hand-off to Quick bid.
   *
   * Existing accounts were stamped as onboarded by the migration that added the
   * column, so nobody who already uses the app sees this.
   */
  const { data: onboarding } = trpc.onboarding.state.useQuery();
  useEffect(() => {
    if (!onboarding?.isFirstRun) return;
    if (route !== "home" && route !== "dashboard") return;
    window.location.hash = "#/welcome";
  }, [onboarding?.isFirstRun, route]);

  // ── Content renderer ───────────────────────────────────────────────────────
  const renderContent = () => {
    if (isInMatDb) return <MaterialDatabasePage onBack={goBack} />;
    if (isOnHome)
      return <HelixBidHomePage onGoToProjects={() => navigate("dashboard")} />;
    if (isOnDashboard)
      return (
        <DashboardPage
          onOpenBid={id => navigate("bids", id)}
          onOpenArchive={() => navigate("bid-archive")}
        />
      );
    if (isOnProjectDetail && activeProjectId)
      return (
        <ProjectDetailPage
          projectId={activeProjectId}
          onBack={() => navigate("dashboard")}
        />
      );
    if (isInTrash) return <TrashPage onBack={goBack} />;
    if (isInSettings) return <SettingsTab onBack={goBack} />;
    if (isInLibraryMats) return <MaterialsLibraryPage />;
    if (isInLaborRates) return <LaborRatesPage />;
    if (isInModifiers) return <ModifiersPage />;
    if (isInLibraryAsms) return <AssembliesLibraryPage />;
    if (isInLibraryKits) return <KitsPage />;
    // Keyed on the id so a fresh /bids/:id remounts into that bid.
    if (isInBids)
      return (
        <BidsPage
          key={activeProjectId ?? "list"}
          initialBidId={activeProjectId}
        />
      );
    if (isInTakeoff && activeProjectId) {
      return (
        <TakeoffPage
          key={`takeoff-${activeProjectId}`}
          bidId={activeProjectId}
          onBack={() => navigate("bids", activeProjectId)}
        />
      );
    }
    // Keyed like the takeoff surface: a different bid is a different document.
    if (isInProposal && activeProjectId) {
      return (
        <ProposalPage
          key={`proposal-${activeProjectId}`}
          bidId={activeProjectId}
          onBack={() => navigate("bids", activeProjectId)}
        />
      );
    }
    if (isInBidArchive)
      return (
        <BidArchivePage
          onBack={() => navigate("dashboard")}
          onOpenBid={id => navigate("bids", id)}
        />
      );
    if (isInClients) return <ClientsPage />;
    if (isInQuickBid) return <QuickBidPage />;
    if (isOnWelcome) return <FirstRunPage />;
    if (isInAdmin) return <AdminSettingsPage />;
    // Every legacy workspace this used to fall through to is gone. The
    // Dashboard is the honest landing for an address that no longer exists.
    return (
      <DashboardPage
        onOpenBid={id => navigate("bids", id)}
        onOpenArchive={() => navigate("bid-archive")}
      />
    );
  };

  const routeKey =
    route === "project-detail" ? `project-${activeProjectId}` : route;

  // ── Sidebar nav item helper ────────────────────────────────────────────────
  const NavBtn = ({
    onClick,
    isActive,
    icon: Icon,
    label,
    title,
  }: {
    onClick: () => void;
    isActive: boolean;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    label: string;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      title={title ?? label}
      className={cn(
        "flex items-center gap-3 px-2.5 py-2.5 rounded-md text-sm font-medium transition-all duration-150",
        "hover:bg-accent hover:text-accent-foreground",
        isActive ? "bp-tab-active text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon
        size={20}
        className={cn("shrink-0", isActive ? "text-[#F5C518]" : "")}
      />
      <span
        className="whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 truncate text-xs"
        style={{ fontFamily: "'Space Grotesk', sans-serif" }}
      >
        {label}
      </span>
    </button>
  );

  /**
   * A labelled group of nav items.
   *
   * ── Why it has two appearances ──────────────────────────────────────────────
   * The sidebar is 64px of icons until you hover it, so a text heading alone
   * would leave the grouping invisible in the state the sidebar is in almost
   * all of the time. Collapsed, each group is separated by a hairline rule;
   * expanded, that rule is replaced by the actual word. Either way the three
   * purposes read as three things rather than one long list.
   *
   * The headings are deliberately plain nouns — Workspace, Library, Settings —
   * naming what the group is FOR, so someone scanning top to bottom can tell
   * daily tools from building blocks from things they touch twice a year.
   */
  const NavSection = ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div className="flex flex-col gap-1">
      <div className="px-2.5 pt-3 pb-1 first:pt-1">
        <span
          className="hidden group-hover:block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 whitespace-nowrap"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {label}
        </span>
        {/* Collapsed stand-in for the heading. aria-hidden because the group is
            already named for assistive tech by the <nav> aria-label below. */}
        <span
          className="block group-hover:hidden h-px bg-sidebar-border mx-1"
          aria-hidden
        />
      </div>
      {children}
    </div>
  );

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background"
      style={{ zoom: uiFontScale }}
    >
      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex flex-col shrink-0 w-16 hover:w-56 transition-[width] duration-200 ease-out
                   bg-sidebar border-r border-sidebar-border overflow-hidden group z-20"
      >
        {/* Logo — click returns to homepage */}
        <div
          onClick={() => navigate("home")}
          className="flex items-center justify-center gap-2 px-3 py-4 h-16 border-b border-sidebar-border shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
          title="HelixBid Home"
        >
          <span
            className="font-bold text-[#F5C518] text-sm shrink-0 group-hover:hidden"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            HB
          </span>
          <span
            className="font-bold text-base whitespace-nowrap hidden group-hover:block transition-opacity duration-150"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          >
            <span className="text-foreground">Helix</span>
            <span className="text-[#F5C518]">Bid</span>
          </span>
        </div>

        {/*
          Three groups, in the order a job goes: the things you open every day,
          the things you build once and reuse, and the things you set up and
          forget. See NavSection for how the grouping survives the collapsed
          64px state.

          Two screens are deliberately absent. `assemblies` (the old
          master_*-backed Assembly Builder) is superseded by Library §
          Assemblies, and having both in one list meant two entries called
          almost the same thing pointing at two different systems. `trash`
          holds soft-deleted LEGACY projects and is superseded by the bid
          Archive below. Both routes still resolve so no link or bookmark
          breaks — they are just no longer advertised.

          Takeoff is absent for a different reason: it is not a destination.
          It lives at /bids/:id/plans and needs a bid to open, so a top-level
          entry would dead-end on "which one?" — the worst thing to put in the
          group meant to be someone's daily tools. It is entered from a bid,
          where the context already exists.
        */}
        <nav
          className="flex flex-col gap-1 p-2 flex-1 overflow-y-auto"
          aria-label="Main"
        >
          <NavSection label="Workspace">
            <NavBtn
              onClick={() => navigate("dashboard")}
              isActive={isOnDashboard || isOnProjectDetail}
              icon={LayoutDashboard}
              label="Dashboard"
              title="Dashboard — every bid by stage"
            />
            <NavBtn
              onClick={() => navigate("quickbid")}
              isActive={isInQuickBid}
              icon={Zap}
              label="Quick bid"
              title="Quick bid — count without a plan"
            />
            <NavBtn
              onClick={() => navigate("bids")}
              isActive={isInBids || isInTakeoff}
              icon={FileText}
              label="Bids"
              title="Bids — open a bid, or its plans"
            />
            {/* Workspace rather than Library: the Library is what a bid is
                assembled FROM, and a client is the other party, not a building
                block. It sits next to Bids because that is what it attaches to. */}
            <NavBtn
              onClick={() => navigate("clients")}
              isActive={isInClients}
              icon={Users}
              label="Clients"
              title="Clients — who the work is for"
            />
          </NavSection>

          <NavSection label="Library">
            <NavBtn
              onClick={() => navigate("library-materials")}
              isActive={isInLibraryMats}
              icon={Boxes}
              label="Materials"
              title="Materials — the catalog assemblies are built from"
            />
            <NavBtn
              onClick={() => navigate("library-labor-rates")}
              isActive={isInLaborRates}
              icon={HardHat}
              label="Labor Rates"
              title="Labor Rates — what an hour costs, by role"
            />
            <NavBtn
              onClick={() => navigate("library-modifiers")}
              isActive={isInModifiers}
              icon={SlidersHorizontal}
              label="Modifiers"
              title="Modifiers — labor adjustments for job conditions"
            />
            <NavBtn
              onClick={() => navigate("library-assemblies")}
              isActive={isInLibraryAsms}
              icon={Layers}
              label="Assemblies"
              title="Assemblies — reusable recipes of materials and labor"
            />
            <NavBtn
              onClick={() => navigate("library-kits")}
              isActive={isInLibraryKits}
              icon={Package}
              label="Kits"
              title="Kits — groups of assemblies added together"
            />
            {/* Labelled "Supplier Pricing" rather than by its route name. The
                screen is the supply-house price list, and calling it "Material
                Database" next to "Materials" put two near-identical names in
                one group for two unrelated tables. The route is unchanged. */}
            <NavBtn
              onClick={() => navigate("matdb")}
              isActive={isInMatDb}
              icon={Database}
              label="Supplier Pricing"
              title="Supplier Pricing — imported supply-house price list"
            />
          </NavSection>
        </nav>

        {/* Settings sits outside the scrolling nav so it stays reachable at the
            bottom however long the Library grows. */}
        <div className="flex flex-col gap-1 p-2 pt-0 shrink-0">
          <NavSection label="Settings">
            <NavBtn
              onClick={() => navigate("settings")}
              isActive={isInSettings}
              icon={Settings}
              label="Company Defaults"
              title="Company defaults — pricing, theme and display"
            />
            <NavBtn
              onClick={() => navigate("bid-archive")}
              isActive={isInBidArchive}
              icon={ArchiveIcon}
              label="Archive"
              title="Archive — restore an archived bid"
            />
            {/* Admin only, and last: nobody else has it, and those who do do
                not need it above the things they use. */}
            {isAdmin && (
              <NavBtn
                onClick={() => navigate("admin")}
                isActive={isInAdmin}
                icon={Shield}
                label="Admin Settings"
                title="Admin Settings"
              />
            )}
          </NavSection>
        </div>

        {/* Version tag */}
        <div className="px-3 py-2 border-t border-sidebar-border shrink-0">
          <span className="text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 font-mono">
            {APP_VERSION_LABEL}
          </span>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-border shrink-0 bg-sidebar">
          <span
            className="font-bold text-base text-foreground cursor-pointer"
            style={{ fontFamily: "'Space Grotesk', sans-serif" }}
            onClick={() => navigate("home")}
          >
            HelixBid
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <ChevronRight size={12} />
            <span className="capitalize">
              {isOnHome
                ? "Home"
                : isOnDashboard
                  ? "Dashboard"
                  : isOnProjectDetail
                    ? "Project"
                    : isInTrash
                      ? "Trash"
                      : isInSettings
                        ? "Settings"
                        : isInMatDb
                          ? "Supplier Pricing"
                          : isInLibraryMats
                            ? "Materials"
                            : isInAdmin
                              ? "Admin Settings"
                              : "Workspace"}
            </span>
          </div>
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden tab-enter" key={routeKey}>
          {renderContent()}
        </div>
      </main>

      {/*
        ── Mobile Bottom Nav ──────────────────────────────────────────────────
        The same three purposes, minus the room to say so. There is no space for
        section headings across five icons, so this carries only the Workspace
        items plus one way into the Library and one into Settings — grouping by
        omission rather than by label.

        It previously offered Home, the legacy Assembly Builder and the legacy
        Trash. All three are gone for the reasons given on the sidebar above; on
        a phone, where there are five slots total, spending two of them on
        superseded screens was the costliest version of that mistake.
      */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 flex bg-sidebar border-t border-border"
        aria-label="Main"
      >
        {(
          [
            {
              label: "Dashboard",
              icon: LayoutDashboard,
              active: isOnDashboard || isOnProjectDetail,
              go: () => navigate("dashboard"),
            },
            {
              label: "Quick bid",
              icon: Zap,
              active: isInQuickBid,
              go: () => navigate("quickbid"),
            },
            {
              label: "Bids",
              icon: FileText,
              active: isInBids || isInTakeoff,
              go: () => navigate("bids"),
            },
            {
              label: "Materials",
              icon: Boxes,
              active: isInLibraryMats,
              go: () => navigate("library-materials"),
            },
            {
              label: "Settings",
              icon: Settings,
              active: isInSettings,
              go: () => navigate("settings"),
            },
          ] as const
        ).map(item => (
          <button
            key={item.label}
            onClick={item.go}
            aria-label={item.label}
            aria-current={item.active ? "page" : undefined}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 py-3 text-[10px] font-medium transition-colors duration-150 relative",
              item.active ? "text-[#F5C518]" : "text-muted-foreground"
            )}
          >
            <item.icon
              size={18}
              className={item.active ? "text-[#F5C518]" : ""}
            />
            {item.active && (
              <span className="absolute top-0 left-0 right-0 h-0.5 bg-[#F5C518] rounded-b" />
            )}
          </button>
        ))}
      </nav>
    </div>
  );
}
