/**
 * The HelixBid emblem — three directions, one still to be chosen.
 *
 * ── Why three ───────────────────────────────────────────────────────────────
 * The mark it replaces is the placeholder "HB" in a rounded square: two letters
 * in the body font, which is what a logo looks like before anyone has decided
 * what the thing is. Picking its replacement is a judgement about how the
 * product should feel, and that is the owner's call, not a detail to settle
 * quietly inside a component. So all three are built for real, at the same
 * quality, and MARK_VARIANT below is the single line that decides which ships.
 *
 *   helix   — the name, made literal. A coil seen from the side, which reads as
 *             a helix and as a spring, a wire coil, a length of flex. Warmest of
 *             the three and the only one that survives being explained.
 *   circuit — a takeoff crosshair with a bolt through it. Says what the product
 *             DOES rather than what it is called: measure the plan, price the
 *             power. Sharpest at small sizes; least tied to the name.
 *   monogram— an H built from two conduit runs and a jumper between them.
 *             Stencil-like, closest to the Space Grotesk headers already in the
 *             app, and the one that would look most at home on a truck door.
 *
 * ── Built as geometry, not as a file ────────────────────────────────────────
 * Inline SVG rather than an asset: the mark appears at 20px in a sidebar and at
 * 96px on the landing hero, it has to take the accent colour from the theme,
 * and it must not cost a network request on the first paint of the page that is
 * a stranger's first impression. Stroke widths are set per size below because a
 * mark scaled linearly from 96px to 20px turns to mush.
 */

export const MARK_VARIANTS = ["helix", "circuit", "monogram"] as const;
export type MarkVariant = (typeof MARK_VARIANTS)[number];

/**
 * The mark the app ships with today.
 *
 * Change this one constant to switch the whole app — sidebar, landing page,
 * favicon-adjacent surfaces and the sharing preview all read it. `helix` is the
 * recommended default: it is the only one of the three that makes the product's
 * name mean something, which is worth a lot when the name is the thing a
 * customer has to remember and repeat.
 */
export const MARK_VARIANT: MarkVariant = "helix";

/** Human-readable notes, so the choice can be discussed without reading SVG. */
export const MARK_NOTES: Record<MarkVariant, { name: string; note: string }> = {
  helix: {
    name: "Coil",
    note: "The name made literal — a helix seen side-on, which also reads as a wire coil. Warmest, and the only one that explains the name.",
  },
  circuit: {
    name: "Crosshair bolt",
    note: "A takeoff crosshair with a bolt through it. Leads with what the product does. Sharpest small, least tied to the name.",
  },
  monogram: {
    name: "Conduit H",
    note: "An H built from two conduit runs and a jumper. Closest to the app's existing type, and the one that works on a truck door.",
  },
};

type MarkProps = {
  /** Rendered size in pixels, square. */
  size?: number;
  /** Override the variant — used by the brand review sheet to show all three. */
  variant?: MarkVariant;
  /** The accent. Defaults to the theme's primary so it follows light/dark. */
  color?: string;
  className?: string;
  /**
   * Set when the mark stands alone as the only naming of the product; left off
   * when a wordmark sits beside it, so a screen reader does not say it twice.
   */
  title?: string;
};

/**
 * Stroke weight by rendered size.
 *
 * Not a single value scaled with the viewBox: at 20px a hairline disappears
 * against a dark sidebar, and at 96px the weight that survives 20px looks like
 * a crayon. Three steps is enough for the sizes this is actually used at.
 */
function strokeFor(size: number): number {
  if (size <= 24) return 3.4;
  if (size <= 48) return 2.8;
  return 2.4;
}

export function BrandMark({
  size = 32,
  variant = MARK_VARIANT,
  color = "var(--bp-yellow, #F5C518)",
  className,
  title,
}: MarkProps) {
  const stroke = strokeFor(size);
  const shared = {
    width: size,
    height: size,
    viewBox: "0 0 32 32",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    className,
    // Decorative unless it is carrying the name on its own.
    role: title ? ("img" as const) : ("presentation" as const),
    "aria-hidden": title ? undefined : true,
  };

  if (variant === "circuit") {
    return (
      <svg {...shared}>
        {title && <title>{title}</title>}
        {/* The crosshair: takeoff, measurement, the thing you aim at a plan. */}
        <circle
          cx="16"
          cy="16"
          r="11.5"
          stroke={color}
          strokeWidth={stroke}
          strokeOpacity={0.45}
        />
        <path
          d="M16 1.5v5M16 25.5v5M1.5 16h5M25.5 16h5"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        {/* The bolt: power, and the diagonal that stops it reading as a target. */}
        <path
          d="M18.4 8.5 11.2 17.2h4.6L13.6 23.5l7.2-8.7h-4.6l2.2-6.3Z"
          fill={color}
        />
      </svg>
    );
  }

  if (variant === "monogram") {
    return (
      <svg {...shared}>
        {title && <title>{title}</title>}
        {/* Two conduit runs with couplings, and the jumper that makes them an H. */}
        <path
          d="M8 4.5v23M24 4.5v23"
          stroke={color}
          strokeWidth={stroke + 1.2}
          strokeLinecap="round"
        />
        <path
          d="M8 16h16"
          stroke={color}
          strokeWidth={stroke + 1.2}
          strokeLinecap="round"
        />
        {/* Couplings — the detail that makes the uprights pipe and not letters. */}
        <path
          d="M4.6 10.2h6.8M20.6 10.2h6.8M4.6 21.8h6.8M20.6 21.8h6.8"
          stroke={color}
          strokeWidth={stroke * 0.8}
          strokeLinecap="round"
          strokeOpacity={0.55}
        />
      </svg>
    );
  }

  // helix — the default.
  return (
    <svg {...shared}>
      {title && <title>{title}</title>}
      {/*
        A coil seen side-on. Four turns: three is too few to read as a helix and
        five closes up at 20px. The near half of each turn is solid and the far
        half is dimmed, which is what makes a flat path read as something with
        depth rather than as a stack of ellipses.
      */}
      <path
        d="M9 5.5c0 3 14 3 14 6s-14 3-14 6 14 3 14 6-14 3-14 3"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeOpacity={0.35}
      />
      <path
        d="M23 5.5c0 3-14 3-14 6s14 3 14 6-14 3-14 6 14 3 14 3"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* The two terminations, so it ends as a conductor rather than trailing off. */}
      <circle cx="23" cy="5.5" r={stroke * 0.85} fill={color} />
      <circle cx="9" cy="26.5" r={stroke * 0.85} fill={color} />
    </svg>
  );
}

/**
 * Mark plus name, locked up as one unit.
 *
 * A single component so the gap, the weight and the optical alignment between
 * the two are decided once. The placeholder this replaces was assembled inline
 * on each screen, which is how the sidebar and the home page came to render the
 * product's own name at two different sizes.
 */
export function BrandLockup({
  size = 32,
  variant = MARK_VARIANT,
  className,
  showEdition = false,
}: {
  size?: number;
  variant?: MarkVariant;
  className?: string;
  /** Adds the "Field Edition" suffix, for surfaces with room for it. */
  showEdition?: boolean;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <BrandMark size={size} variant={variant} />
      <span className="inline-flex flex-col leading-none">
        <span
          className="font-bold tracking-tight text-foreground"
          style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: size * 0.62,
          }}
        >
          Helix<span style={{ color: "var(--bp-yellow, #F5C518)" }}>Bid</span>
        </span>
        {showEdition && (
          <span
            className="text-muted-foreground uppercase"
            style={{ fontSize: size * 0.26, letterSpacing: "0.14em" }}
          >
            Field Edition
          </span>
        )}
      </span>
    </span>
  );
}
