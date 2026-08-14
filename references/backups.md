# Backups

An export of everything — every table and every uploaded file — to Cloudflare
R2, deliberately independent of Manus.

---

## 1. Why this exists

`references/deploying.md` § 8 lists four Manus services this app cannot run
without. One of them holds every plan PDF and every company logo. If access to
that account ends, the database might be recoverable and the files would not be.

This tool copies both somewhere Manus has no involvement in. It reads through
Manus — that is where the files are, and there is no other way to reach them —
but it writes to a bucket reachable with nothing but four credentials and the
public internet.

**The read path is the deadline.** Once a backup is in R2 it is independent; up
until then it depends on Manus access still working. That asymmetry is the whole
reason to run this sooner rather than later.

## 2. Configuration

Four variables, server-side only, `.env` (which is gitignored):

```bash
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=helixbid-backups
```

Optional:

| Variable           | Default                                      |
| ------------------ | -------------------------------------------- |
| `R2_ENDPOINT`      | `https://<account>.r2.cloudflarestorage.com` |
| `R2_BACKUP_PREFIX` | `helixbid`                                   |

**No `VITE_` prefix on any of them, ever.** Vite inlines every `VITE_*` variable
into the client bundle at build time, so a secret named that way is published to
every visitor. Same rule as the LLM gateway key. `server/backup.test.ts` asserts
it.

Create the R2 token with **Object Read & Write** on that one bucket. It does not
need account-level permissions.

## 3. Running it

```bash
pnpm tsx scripts/backup.mts
```

This is the trigger to reach for. It needs `DATABASE_URL` and the four R2
values, and nothing else — no login, no session, no deployed app, and no request
timeout sitting over a job that legitimately takes minutes. **On the day this
matters, the app being up is not a safe assumption.**

Exit code is 0 only on a completely clean run. Any failed file, any error, is 1.

There is also an admin-only route — `backup.run` and `backup.status`
(`server/routers/backupRouter.ts`) — for taking one from a phone, and for
answering "is this even configured?" without a terminal. A large backup may
outlast the HTTP request; that is expected, and the CLI is the answer.

## 4. What lands in the bucket

```
<prefix>/<timestamp>/manifest.json      what ran, what it found, what failed
<prefix>/<timestamp>/database.sql.gz    every table, gzipped
<prefix>/<timestamp>/files/<key>        every uploaded file, at its storage key
```

Timestamped rather than overwritten, so a backup taken after something has
already gone wrong cannot destroy the good one before it.

The manifest carries the same failures the terminal printed, so the record of
what went wrong sits beside the data rather than in a window someone closed.

## 5. Restoring

```bash
gunzip -c database.sql.gz | mysql -u USER -p DBNAME
```

The dump sets `FOREIGN_KEY_CHECKS = 0` around itself, so table order does not
matter. It includes `__drizzle_migrations`, so a restored database knows which
migrations have run and does not invite anyone to re-run them over live data.

Files restore by uploading `files/<key>` back to whatever storage the app is
using, at the same key. The keys in the database are unchanged by a restore, so
they line up as long as the object keys are preserved.

## 6. The failure this design is most afraid of

A backup nobody finds out is broken until the day the original is gone.

Two things follow from that. **Nothing fails silently:** a file that cannot be
fetched is recorded and the run is marked failed, rather than being skipped
quietly; the destination is checked _before_ anything is read, so a bad
credential costs a second rather than an hour. And **the tables come from the
database, not from `drizzle/schema.ts`** — enumerating from the TypeScript
schema would back up exactly the tables somebody remembered to declare, and
silently miss `__drizzle_migrations` and anything a hand-written migration made.

`server/backup.test.ts` restores the dump into a scratch schema and compares it
table for table and row for row. That test is not optional garnish: the first
version of this tool produced a dump of exactly the right shape that **no MySQL
server would load**, because mysql2 parses JSON columns into JavaScript arrays
and the driver's escaper expands an array into a comma-separated value list.
`takeoff_runs.points` is a JSON array, so every dump of a database with a traced
run was corrupt. Every other test passed. Only the restore caught it.

If you change anything in `server/backup/`, run that test.

## 7. Not built yet

- **Scheduling.** Manual only, on purpose, until the manual version has been
  proven against the real bucket. When it is added it belongs on the platform
  cron (`CLAUDE.md` § Scheduled work), not a `setInterval`.
- **Retention.** Nothing deletes old backups. For now that is the safe
  direction; revisit before the bucket becomes expensive.
- **Restore automation.** Restoring is the documented manual sequence above.
