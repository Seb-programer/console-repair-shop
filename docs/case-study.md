# Case study: Console Repair Shop Manager

**[Leer en español](caso-de-estudio.md)**

## The problem
A small business repairs, maintains and sells video-game consoles. Before this project, it tracked everything on paper and in WhatsApp conversations, which caused four problems:
- **Lost information:** devices came in without a clear record of their condition or accessories.
- **Repeated questions:** customers called or messaged again and again to ask "is my console ready?".
- **No visibility for the team:** nobody had a shared view of the workload, such as how many consoles were waiting, in progress or finished.
- **No online presence:** there was nowhere to show completed work or the products for sale.

## Goals
1. Register each console at reception with customer data and photos, so there is evidence of its condition on arrival.
2. Let technicians document every procedure with photos, a repair result and the spare parts needed.
3. Give customers a self-service way to check status without exposing anyone's personal data.
4. Give each staff role only the permissions it needs.
5. Run on the owner's existing PC at almost no cost, with a path to a homelab or cloud server later.

## Process
The project was built by directing a team of AI agents with Claude Code, with one role per agent: orchestrator, database, backend, frontend and QA. Each phase followed the same loop:

1. **Requirements:** clarifying questions on decisions that only the owner can make. Examples: how customers identify themselves, whether videos are uploaded or linked, and what the technician's report contains.
2. **Specification:** a written contract in `docs/ESPECIFICACION*.md` covering the permission matrix, data model, every endpoint with its inputs and outputs, and the screens.
3. **Parallel build:** the database, backend and frontend agents worked against that contract at the same time. Notes passed between them, such as "the server is not in SQL strict mode, so whitelist enums" or "delete files when a cascade deletes rows".
4. **Verification:** the orchestrator re-ran the tests and checked the data after every delivery. QA then reviewed the code, ran end-to-end flows per role and tested in a real browser on desktop and mobile.

| Phase | Scope |
|---|---|
| 1 | Internal app: customers, reception with photos, procedures, statuses, catalog, sales, users with roles |
| 2 | Public website, image and video gallery, status lookup, repair report, spare parts, internal notes |
| 3 | Production mode, security hardening, Cloudflare Tunnel publishing, backups, CI |

## Architecture decisions

| Decision | Why |
|---|---|
| **Express + React + MySQL** | A widely known, cheap-to-host stack. The owner already had a Windows PC, and XAMPP provided MySQL plus phpMyAdmin to inspect the data. |
| **Single server in production** | Express serves the API, the uploads and the compiled React app on one port. That means one process to run, one firewall rule and a same-origin policy with no CORS. |
| **Files on disk, paths in the database** | Simple and enough for this scale. The backend deletes the files when a record is deleted, because database cascades only remove rows. |
| **Migrations instead of re-creating the schema** | Phase 2 altered a database that already held real data. The migration is idempotent, was rehearsed on a throwaway copy and was preceded by a backup. A checksum confirmed the existing data was untouched. |
| **ID number for the public lookup** | Chosen by the owner because it is easy for customers. It is mitigated with a field whitelist, first name only, the last 4 characters of the serial number, identical 404 responses whether the ID exists or not, and a rate limit. |
| **Cloudflare Tunnel** | Publishes from a home PC without opening router ports, with HTTPS included. A temporary URL serves for testing; a named tunnel with a custom domain is planned for a future homelab. |

## Security
- **Authorization:** checked on every route against the permission matrix. QA audited it route by route.
- **Real client IP behind the tunnel:** `CF-Connecting-IP` is trusted only when the connection comes from loopback, where cloudflared runs. Tests show that a LAN client cannot bypass the rate limits by forging headers.
- **Upload validation:** uploads are checked against the file's real signature (JPEG, PNG, WebP, MP4, WebM). QA found that the first version trusted the declared MIME type and fixed it.
- **Production headers:** a strict CSP with no `unsafe-inline`, tested in a real browser with zero violations. COOP and HSTS are only sent over HTTPS.
- **Login:** generic errors, so an inactive user is not revealed. Attempts are limited per IP and user. A minimum password policy applies.
- **Safe publishing:** the publish script refuses to go online while any account still uses a seed password or the app is running in development mode.

## Quality
- **117 automated tests:** unit tests plus integration tests against a real MariaDB. They cover privacy rules, rate limits, permissions per role, upload validation, transactions such as stock locking with `SELECT … FOR UPDATE`, and UTF-8 round-trips.
- **Playwright browser checks:** desktop and mobile layouts, no horizontal scroll, no console errors and no CSP violations.
- **CI:** GitHub Actions runs the backend tests against a MariaDB service, plus the frontend lint and build.

## Results
- Reception, repair tracking and sales live in one system, with photo evidence at every step.
- Customers check their console's status themselves, from any phone.
- The app runs on the shop's LAN and can be published to the internet in one click, after a safety check.
- Backups and migration to another PC take one click each: `exportar.bat` and `instalar.bat`.

## What I would do next
- A named Cloudflare Tunnel with a custom domain, running as a Windows service or in Docker on a homelab.
- Automatic daily backups stored off the machine.
- Printable reception receipts with the order number, and WhatsApp notifications when the status changes.
- Moving uploads to object storage if the app moves to the cloud.
