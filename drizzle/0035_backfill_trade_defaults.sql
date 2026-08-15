-- Stamp every pre-existing row with its trade.
--
-- 0034 added each `trade` column as NOT NULL DEFAULT, which MySQL already
-- applies to existing rows, so on a healthy database this changes nothing. It
-- is written down anyway for two reasons: the backfill is the part of the
-- multi-trade change that has to be TRUE rather than merely intended, and a
-- column that arrived some other way (restored dump, a hand-run ALTER, an
-- earlier nullable version) would leave NULLs that nothing else would catch.
--
-- Every statement is idempotent and re-running is harmless. Same shape as
-- 0032_backfill_productivity_pct.sql.
--
-- Two defaults, deliberately — see shared/trades.ts and ASSEMBLIES_PLAN.md
-- § MULTI-TRADE STRUCTURE:
--   'electrical' for the trade-gated library (materials, assemblies, kits),
--   'all'        for what is shared across trades regardless of unlock
--                (labor rates, pricing defaults, branding, proposal settings).
-- Stamping the second group 'electrical' would hide a contractor's rates and
-- licence details the day a second trade unlocks.

-- ── Trade-gated library ──────────────────────────────────────────────────────
UPDATE `materials`   SET `trade` = 'electrical' WHERE `trade` IS NULL OR `trade` = '';
--> statement-breakpoint
UPDATE `assemblies`  SET `trade` = 'electrical' WHERE `trade` IS NULL OR `trade` = '';
--> statement-breakpoint
UPDATE `kits`        SET `trade` = 'electrical' WHERE `trade` IS NULL OR `trade` = '';
--> statement-breakpoint

-- ── Shared across every trade ────────────────────────────────────────────────
UPDATE `labor_rates`       SET `trade` = 'all' WHERE `trade` IS NULL OR `trade` = '';
--> statement-breakpoint
UPDATE `pricing_defaults`  SET `trade` = 'all' WHERE `trade` IS NULL OR `trade` = '';
--> statement-breakpoint
UPDATE `company_branding`  SET `trade` = 'all' WHERE `trade` IS NULL OR `trade` = '';
--> statement-breakpoint
UPDATE `proposal_settings` SET `trade` = 'all' WHERE `trade` IS NULL OR `trade` = '';
