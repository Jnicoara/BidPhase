/**
 * The app version shown in the UI.
 *
 * This lives in one place because it did not used to: the sidebar and the home
 * page each hardcoded their own string and drifted apart (v5.50 and v5.46),
 * so the app told you two different things about itself depending on where you
 * looked. Import APP_VERSION_LABEL rather than writing a version literal into
 * a component.
 *
 * The number tracks the `vX.YY` checkpoint convention used in commit messages
 * (see CLAUDE.md § Conventions) — bump it here when a checkpoint ships.
 */
export const APP_VERSION = "v5.96";

/** Edition suffix — the app is field-first, and the tag has always said so. */
export const APP_EDITION = "Field Edition";

/** What the UI actually renders, e.g. "v5.96 · Field Edition". */
export const APP_VERSION_LABEL = `${APP_VERSION} · ${APP_EDITION}`;
