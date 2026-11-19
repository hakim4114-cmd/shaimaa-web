# Backups and the problems log

## Daily database backup (`.github/workflows/backup.yml`)

Every day at 02:17 UTC, GitHub Actions dumps the database (schemas `public`, `app` and `auth`), encrypts the file with AES-256 using your passphrase, and keeps it as a workflow artifact for 30 days. The file contains customer names, phones and addresses: it is never stored unencrypted.

### One-time setup (owner)

1. Supabase → Project Settings → Database → **Connection string** → *Session pooler*, URI form. Replace `[YOUR-PASSWORD]` with the database password (reset it there if you do not know it).
2. GitHub → this repository → Settings → Secrets and variables → Actions → **New repository secret**:
   - `SUPABASE_DB_URL` = the connection string from step 1;
   - `BACKUP_PASSPHRASE` = a long passphrase you choose. **Write it down somewhere safe**: without it no backup can be opened, and nobody can recover it.
3. GitHub → Actions → *Database backup* → **Run workflow** once, and check that it ends green with a file attached.

Never paste either value in a chat, an issue or a file.

### Restore (when something was lost)

1. Download the artifact (`merchant-os-YYYY-MM-DD.dump.gpg`) from the workflow run.
2. Decrypt: `gpg --decrypt --output db.dump merchant-os-YYYY-MM-DD.dump.gpg` (asks for the passphrase).
3. Restore into a **new** Supabase project first, never directly over production:
   `pg_restore --no-owner --no-privileges --dbname "<new project connection string>" db.dump`
4. Check the data, then decide what to copy back. Delete `db.dump` afterwards.

Limits: artifacts last 30 days; files uploaded to Storage (product photos) are not included.

## Problems log (`/problems`)

Background failures are recorded in `system_events` and shown in the bell to owners and admins:

- a Sendit status update rejected (bad signature, or not applicable to the parcel);
- an online store order rejected (bad signature), unreadable, or not saved;
- an automatic parcel that Sendit refused.

The same open problem seen again within 24 hours increases its counter instead of adding a line. Fix the cause, then press **Handled**. Code crashes are not captured here; add an error tracker (for example Sentry) before opening to other merchants.
