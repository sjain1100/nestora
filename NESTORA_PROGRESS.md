# NESTORA Development Progress

Date: 22 November 2026

## Working copies

- Active working copy: D:\WT
- Original project copy on the C: drive (retained)
- The original C: project was retained. The 30 root files already moved during the initial copy were restored; no original project or backup was deleted.
- D: now includes later admin dashboard and local development additions. The original C: copy remains the earlier complete snapshot and was not overwritten with those later edits.

## Completed

- Reworked the existing Express application to use MongoDB/Mongoose, with modular models, controllers, routes, validation, authentication, authorization, uploads, and centralized security/error handling.
- Added role-based buyer, broker, seller, and admin flows for accounts, properties, moderation, favorites, enquiries, visits, and administration.
- Integrated the existing HTML/JavaScript frontend with the API and cookie-based sessions.
- Added paginated admin lists and filters, admin user details, broker review notes, property listing status and featured controls, enquiry/visit status controls, and audit-log viewing in the D: dashboard.
- Added an isolated local-development command, npm run dev:local, and documented it. It uses a local MongoDB database under the ignored .test-cache directory and does not connect to Atlas.
- Fixed the public Contact form: it now stores messages through a rate-limited public endpoint, and administrators can review and update them in the dashboard.
- Started the D: development server at http://localhost:5000 with a local MongoDB process. The API health endpoint reports MongoDB ready, and the dashboard script is served successfully.

## Files changed

- Backend: backend/app.js, backend/config/, backend/models/, backend/controllers/, backend/middleware/, backend/routes/, and backend/utils/.
- Frontend: api-client.js, frontend-auth.js, script.js, dashboard-ui.js, dashboard.html, dashboard-admin.js, and demo.css.
- Setup and project support: package.json, package-lock.json, README.md, .env.example, .gitignore, database.js, server.js, scripts/, and test/backend.test.js.
- dashboard-admin.js is included in Express's explicit static-file allowlist in backend/app.js.
- No secret values from .env were included in this report.

## Verification

- Integration suite: passed once with one test and no failures after moving its temporary MongoDB data path to D:.
- An earlier plain npm test run crashed Node with an out-of-memory error. A subsequent attempt hit a MongoDB startup error when binary cache and database files shared a directory; a separate data directory resolved that issue. No integration test was run after the latest dashboard edits.
- node --check passed for the changed JavaScript files, including the API client, both dashboard scripts, backend/app.js, and the local startup script. package.json parsing passed.
- HTTP checks returned 200 for the dashboard page and dashboard-admin.js; /api/health returned ok with MongoDB connected.
- Contact-route smoke check: an unauthenticated submission with an invalid email received HTTP 400 validation feedback rather than the previous buyer-authentication error; no database record was created. Current preview URLs returned HTTP 200 for /api/health, /contact.html, /script.js, and /dashboard-admin.js.
- The C: backup was checked before the latest D: additions. The two new D: files dashboard-admin.js and scripts/start-local.js are intentionally not copied back over the original snapshot.

- Current local MongoDB database name: `nestora_dev`; on-disk data directory: `D:\WT\.test-cache\nestora-dev-db-20261122-130654`.

## Remaining

- Atlas is not configured in .env; the current live D: server uses an isolated local MongoDB database. To use Atlas with npm start, configure MONGO_URI and a unique JWT_SECRET of at least 32 characters.
- Cloudinary credentials are needed for persistent production image storage. SMTP credentials are needed for production email verification and password-reset delivery.
- Create the first admin privately with npm run create-admin after configuring a database and the ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD environment variables. No default admin account was created.
- The new admin controls passed syntax and HTTP checks; they have not had a manual browser interaction review.

## Commands

1. Set the working directory to D:\WT.
2. Run npm install.
3. Run npm run dev:local for isolated local development.
4. For Atlas, configure .env and run npm start.

## Follow-up: demo listings and feedback

- Seeded 12 illustrative demo properties in the local database: three each for Bangalore, Delhi, Mumbai, and Pune. The seed created a reserved sample seller with a random unusable password and is idempotent. It refuses production and any non-loopback MongoDB host.
- Added sample badges on listing cards and a demo-only disclaimer on detail pages so preview inventory is not presented as real offers.
- Added illustrated success/error cards, dismissible toast notifications, and photo thumbnails before upload. The photo selector enforces the backend limits: at most six JPG, PNG, or WebP files, 5 MB each.
- The local API returned 12 properties, grouped evenly across the four configured cities. Health and public page/script requests returned HTTP 200. Node syntax checks passed for all changed JavaScript files.
- View public properties at http://localhost:5000/properties.html. Contact messages and all admin records are available from the dashboard after admin login is set up. MongoDB Compass can connect to mongodb://127.0.0.1:56890/nestora_dev; the on-disk files are under D:\WT\.test-cache\nestora-dev-db-20261122-130654. Local uploaded photos are stored under D:\WT\uploads.
- A manual browser interaction review of photo upload and the updated graphic messages remains to be done.
- Follow-up files changed: api-client.js, style.css, script.js, frontend-auth.js, dashboard-ui.js, dashboard-admin.js, account.html, backend/models/Property.js, scripts/demo-properties.js, scripts/seed-demo.js, scripts/start-local.js, README.md, .env.example, and this progress file.
- The active preview server was restarted with a temporary random development session secret because .env does not contain JWT_SECRET. npm start still requires the owner to set a persistent secret; the private .env was not displayed.

## Follow-up: account and property detail polish

- Corrected the account page CSS scope so sign-in and registration forms render as readable cards at desktop and narrow viewports.
- Removed static White Villa facts from the property detail template. Title, listing price, area, description, amenities, metadata, location, gallery, and broker card are now sourced from the selected API record. Missing and unavailable listings display a designed recovery state. Sample sellers do not get a fabricated agent identity.
- Verification included syntax checks, a live property-detail request, browser review of account styling and populated property facts, and missing/invalid-listing states.

## Follow-up: search results and shared luxury finish

- Fixed property-type filtering to match case-insensitively in the API and normalized homepage search labels. The Properties page now offers all schema property types, aligns budget bands with homepage search, preserves active filters in the URL, scrolls to results, and shows designed loading, empty, and error states.
- Added the illustrative `Baner Courtyard Villa` in Pune at ₹1.78 Cr so the screenshot's Pune / Villa / ₹1–2 Cr search returns a matching card. The idempotent seed inserted one sample listing; the local inventory now contains 13 samples across the four cities.
- Added a consistent luxury finish across navigation, page headers, filter panels, listing cards, contact/account/detail panels, and footers using charcoal, ivory, champagne accents, softer shadows, and refined hover/focus states. Authentication and existing data flows remain enabled.
- Files changed across these follow-ups: `backend/controllers/propertyController.js`, `property-details.html`, `properties.html`, `script.js`, `style.css`, `scripts/demo-properties.js`, `README.md`, and this progress file.
- Verification: `node --check` passed for `script.js`, `backend/controllers/propertyController.js`, and `scripts/demo-properties.js`. The local API returned one record for Pune / Villa / ₹1–2 Cr; browser review showed the matching `Baner Courtyard Villa` card at ₹1,78,00,000 and preserved filter values. No full integration suite was run.

## Luxury frontend polish follow-up

- A single property match now expands into a wide, editorial feature card, with a stacked mobile layout; this avoids leaving a lone match in a narrow slot in the three-column grid.
- Browser review covered the home hero, account and registration forms, about hero, property detail, and the Pune / Villa / ₹1–2 Cr search. The filtered page retains the selected controls and displays the matching sample listing with its correct ₹1,78,00,000 price.
- Files changed in this follow-up: `script.js`, `style.css`, and this progress file. Authentication flows were not altered.
- Verification: `node --check script.js` passed; the filtered browser view rendered the property result and selection labels. The full integration suite was not run.

## Git and deployment follow-up — 23 November 2026

- Initialized a local Git repository in the active `D:\WT` copy on branch `main`; the retained original C: copy was not changed.
- Confirmed `.env`, `node_modules`, `uploads`, `data`, and `.test-cache` are ignored. No files have been staged or committed, and no remote is configured.
- The connected GitHub account only exposed a separate Lovable project, so it was not modified or used for NESTORA.
- The user's GitHub target is `https://github.com/sjain1100/nestora.git` (public and empty when checked). It is configured as `origin`; an initial local commit exists.
- `git push` could not authenticate because no GitHub credential was available in the shell. The remote still needs its first commit. No `.env`, uploads, database/cache files, or separate `student-dashboard` content were committed.
