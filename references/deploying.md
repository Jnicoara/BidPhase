# Deploying HelixBid

Reference for the deploy sequence summarised in `CLAUDE.md` § Deploying.

---

## 1. The one fact that explains everything

**GitHub is not connected to the live site.** There is no CI, no GitHub Actions
workflow, no Dockerfile, no cloud build config, and `origin` is the only remote.
Nothing observes a push.

The live site runs from the **Manus project's own copy** of this repo, deployed
by a human pressing **Deploy** in the Manus UI. Getting code live is therefore
two separate acts: push it to GitHub, then go make Manus pull it.

| Action                                         | Effect on the live site              |
| ---------------------------------------------- | ------------------------------------ |
| `git push origin main`                         | None.                                |
| Commit in the local checkout                   | None.                                |
| Manus session: `git pull origin main` + Deploy | This is the only thing that deploys. |

## 2. Direction of travel — GitHub → Manus, never the reverse

The local checkout plus GitHub is the source of truth. Manus is a deployment
target that pulls.

This is a rule rather than a preference because the repo has already diverged
once. The project began inside Manus — that is what the 197 `Checkpoint:`
commits are — and the last of them is `ff469cb` (2026-08-10). Work then moved to
a local checkout driven by Claude Code, which pushes to GitHub and nothing else.
51 commits later the live site was still serving the pre-`ff469cb` build. No
error was raised at any point, because from each side's perspective nothing was
wrong.

Editing directly in the Manus workspace re-opens the same gap from the other
end. If it happens anyway, **push that work to GitHub first**, then deploy — do
not merge GitHub into the Manus copy and leave the two reconciled only there.

## 3. Pre-flight: has Manus got anything GitHub hasn't?

Run this in the Manus sandbox **before** pulling. It is the whole safety check.

```bash
git status --porcelain          # uncommitted edits — expect empty
git log origin/main..HEAD       # local-only commits — expect empty
git stash list                  # stashed work — expect empty
git fetch origin && git log HEAD..origin/main --oneline | wc -l   # how far behind
```

Interpretation:

- **All empty except the last** → clean. Manus has nothing unique; pulling is
  lossless. Proceed.
- **Anything in the first three** → **stop.** That is work that exists only in
  Manus. Push it to GitHub (`git push origin HEAD:a-rescue-branch`) and sort out
  the merge before deploying. A `git pull` or checkout here can bury it.

Also worth capturing before you touch anything, so "what was live" is answerable
later:

```bash
git rev-parse --short HEAD      # the commit the Manus copy is sitting on
git log -1 --format='%ad %s'    # and what it was
```

## 4. Deploy sequence

1. **Pre-flight** — § 3 above. Do not skip it; it is the only thing standing
   between an unpushed change and permanent loss.
2. **`git pull origin main`** — the bridge that does not otherwise exist.
3. **`pnpm install`** — only if `package.json` / the lockfile moved.
4. **`pnpm db:push`** — apply pending migrations. **Before deploying, not
   after.**
5. **Save a checkpoint** in Manus.
6. **Deploy.**
7. **Verify** — § 6.
8. **Register any new scheduled job** — § 7.

## 5. Migrations are the sharp edge

`pnpm db:push` is step 4 rather than an afterthought because a skipped migration
**does not fail loudly**. The server starts, serves pages, and renders wrong
data. `.claude/skills/run-helixbid/SKILL.md` documents the symptoms in detail:
a single `Seed failed: ... Unknown column` line in the log at startup, materials
rendering as one flat list with no categories, and per-material trade slang
finding nothing while the global alias map keeps working — so search looks fine
until someone tries "1900" or "gem box".

Count what is pending before you deploy:

```bash
ls drizzle/*.sql | wc -l        # migrations in the repo
```

and compare against what the database has actually run. When in doubt, run
`pnpm db:push` — it is idempotent.

## 6. Verifying a deploy actually took

A deploy that silently didn't take looks identical to one that did, so check
something that could only be true of the new build:

- **The navigation helper** (Dashboard → "Ask where to find something") is the
  cheapest probe. It exercises `BUILT_IN_FORGE_API_KEY`, which exists **only on
  deployed infrastructure** — it is absent from every local `.env`, so this
  feature can never be verified on a dev machine. If it returns a screen and a
  button, the platform wiring is intact.
- **The version tag** in the sidebar footer (hover to reveal) reads
  `APP_VERSION` from `shared/version.ts`. If it shows an older number than the
  one on `main`, the deploy did not take.
- **A schema-dependent screen** — Materials grouped into categories, with "1900"
  and "gem box" returning hits. Proves step 4 ran.

## 7. Scheduled jobs need a second, manual step

Deploying a handler under `/api/scheduled/` does **not** schedule it. The cron
is created once, from a Manus sandbox terminal, **after** the site is deployed —
a dev machine is unreachable from the platform, so this cannot be done from a
local checkout.

The exact command for each job lives in that job's own header comment. The
working example is `server/scheduled/purgeArchivedBids.ts` (the 30-day archive
purge, `0 30 3 * * *`, six fields with seconds first, UTC).

`references/periodic-updates.md` is the full reference for the cron system.
`CLAUDE.md` § Scheduled work explains why failure here points at "keeps too
much" rather than "deletes too early".

## 8. Platform services the app cannot run without

Relevant when anyone proposes hosting this elsewhere. Four Manus services are
load-bearing:

| Service          | Env / endpoint                                                         | What breaks without it                                                                                    |
| ---------------- | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| OAuth login      | `OAUTH_SERVER_URL`                                                     | All sign-in. Auth is OAuth-only; no password flow is wired up despite `passwordHash` existing on `users`. |
| LLM gateway      | `BUILT_IN_FORGE_API_KEY` / `BUILT_IN_FORGE_API_URL` → `forge.manus.im` | The navigation helper and the material alias suggester. Both degrade gracefully, so this fails quietly.   |
| S3 presign proxy | `server/_core/storage.ts`, `storageProxy.ts`                           | Plan PDF upload and cross-device sync.                                                                    |
| Cron             | Manus platform scheduler                                               | The archive purge (§ 7).                                                                                  |

Leaving Manus means replacing all four, including building a login system.
It is not a configuration change.

**Gotcha:** when the gateway key is missing, the platform's own error message
reads `OPENAI_API_KEY is not configured` (`server/_core/llm.ts`). That string is
mislabelled — the variable it actually wants is `BUILT_IN_FORGE_API_KEY`, and
the app has no OpenAI dependency of any kind. It has sent one investigation down
the wrong path already.
