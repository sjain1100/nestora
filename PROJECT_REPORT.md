# NESTORA — Full Project Report

**Report date:** 23 November 2026  
**Active working copy:** `D:\WT`  
**Original copy:** earlier copy on the C: drive (retained)  
**Project type:** Real-estate listings website with an Express API and MongoDB

## 1. Executive summary

NESTORA is a multi-role property marketplace prototype. It combines a responsive HTML/CSS/JavaScript website with an Express and Mongoose backend. It includes account and role workflows, property search and detail pages, broker/seller listing management, photo uploads, favorites, enquiries, visit requests, a public contact form, and administrator moderation screens.

The local development database contains illustrative sample listings for Mumbai, Pune, Bangalore, and Delhi. These records are explicitly marked as samples. The current backend is configured for local MongoDB development; MongoDB Atlas, production email, persistent photo storage, and a hosting account have not been configured. A Render deployment blueprint is prepared, but the site has not been published.

## 2. Product and user-facing pages

- **Home:** luxury-themed property landing page and search entry point.
- **Properties:** city, type, and price filters; API-backed results; loading, empty, and error feedback; URL-preserved filters; favorites; responsive listing cards.
- **Property details:** property-specific description, price, area, amenities, photos, and broker data loaded from the selected property record. Missing/invalid listings have a recovery state.
- **About and Contact:** brand/story pages and contact enquiry form. The contact form writes to the backend and is rate-limited.
- **Account and authentication:** registration, sign-in, email verification, forgot/reset password, and role-specific login pages.
- **Buyer dashboard:** account/profile, saved properties, enquiries, and visit requests.
- **Broker and seller dashboards:** profile/listing management and photo upload. Broker listing publication depends on verification and administrator approval.
- **Admin dashboard:** overview/statistics, users, broker verification, property review, enquiry/visit queues, contact messages, and selected audit records.

The shared styling uses a charcoal, ivory, and champagne palette. The home, account, about, property-detail, and filtered-results pages received browser visual review. A single matching search result uses a wider feature-card layout; on narrow screens it stacks vertically.

## 3. Backend and architecture

- **Runtime:** Node.js with Express 5 and Mongoose.
- **Database:** MongoDB. Production is designed for MongoDB Atlas; local development uses `mongodb-memory-server` with a persistent on-disk path.
- **Serving model:** Express serves an explicit allowlist of site pages and scripts from the same origin as the API. This supports same-origin HttpOnly cookie sessions.
- **Code organization:** `backend/config`, `models`, `controllers`, `routes`, `middleware`, and `utils` separate database, data, request handling, access control, and shared logic.
- **Main models:** users, broker profiles, properties, favorites, enquiries, visits, contact messages, and audit logs.
- **Main API groups:** `/api/auth`, `/api/properties`, `/api/broker`, `/api/favorites`, `/api/inquiries`, `/api/visits`, `/api/contact`, `/api/admin`, and `/api/health`.
- **Health check:** `/api/health` returns ready only when Mongoose reports an active database connection.

## 4. Implemented workflows

### Accounts and authentication

- Public accounts can register as buyer, broker, or seller. Public registration cannot create an administrator.
- Passwords are stored as bcrypt hashes.
- Signed-in sessions use JWTs in HttpOnly cookies. Production cookies are marked secure; the application also uses a readable CSRF cookie paired with a request header for protected mutations.
- Registration email verification, password reset, logout, profile edits, password changes, and per-user token invalidation are implemented.
- Production registration and reset flows require configured SMTP. Development-only responses can include one-use verification/reset tokens.
- The first administrator is created with `npm run create-admin`; no default administrator account is created.

### Listings and moderation

- Public visitors can browse approved/active properties and filter by city, property type, and price band.
- Buyers can favorite properties, send enquiries, and request visits.
- Sellers and brokers can create/manage their own properties. Ownership and role checks are enforced by the API.
- New listings require moderation. Broker verification is a separate administrator-controlled step.
- Administrators can review listings and update approval/listing states, review brokers, suspend users, and manage enquiry, visit, and contact queues.
- Lists are paginated, with a maximum page size of 50.

### Photo uploads and messages

- Seller/broker dashboards allow up to six JPG, PNG, or WebP images per property, maximum 5 MB each. Image signatures are checked and the UI previews selected images.
- Local development uploads go to `D:\WT\uploads`.
- Production uploads require Cloudinary because typical hosted application filesystems are ephemeral.
- Public contact submissions are validated and limited to five requests per 15 minutes per client; administrators can review and update messages.
- Frontend feedback includes styled success/error messages, loading states, retry/empty states, and dismissible notices.

## 5. Data and files

### Local database

- Database name: `nestora_dev`.
- Documented MongoDB Compass URI while the local MongoDB process is running: `mongodb://127.0.0.1:56890/nestora_dev`.
- Local database files: `D:\WT\.test-cache\nestora-dev-db-20261122-130654`.
- The data directory and `uploads/` are ignored by Git and are not part of the Render deployment source.
- Sample inventory: 13 illustrative listings across Mumbai, Pune, Bangalore, and Delhi. The seeded content is marked as sample/not a live offer.
- Production Atlas is not configured and no local users/listings have been migrated to a hosted database.

The last health check returned `503` with `MongoDB is not connected`. Therefore the Compass URI and local data folder describe the configured development database, but the current local server is not confirmed ready. Its process was left untouched to avoid risking data.

### Where records are stored

When MongoDB is connected, the Mongoose models map to collections for users, properties, broker profiles, favorites, enquiries, visits, contact messages, and audit logs. Uploaded local development images are separate files under `uploads/`; in production, image files belong in Cloudinary and their URLs/metadata are stored with property records.

## 6. Security and validation

- Helmet security headers, reduced Express fingerprinting, HPP request-parameter protection, bounded JSON/form request sizes, and centralized error handling are configured.
- CORS and mutation-origin checks use explicitly configured origins. Cookie-authenticated write operations require a matching CSRF token.
- API routes enforce roles and resource ownership server-side; an unauthorized buyer cannot administer records or manage a broker's listing.
- Login, verification, reset, and contact endpoints are rate-limited.
- Input validation/sanitization, password hashing, safe user serialization, and upload signature/size/count checks are implemented.
- `.env`, local databases, uploads, and dependency folders are excluded from version control by `.gitignore`. Secret values have not been copied into the deployment report or Render Blueprint.
- These controls are implementation measures, not a formal penetration test or independent production security audit.

## 7. Local development

From `D:\WT`:

```powershell
npm install
npm run dev:local
```

Open `http://localhost:5000`. The local startup script creates a local MongoDB process and uses the persistent project data directory. It does not connect to Atlas and overrides development mail/photo services with safe local behavior.

The sample seed command is `npm run seed:demo`. It refuses production and non-loopback MongoDB hosts. For a normal Atlas-backed run, configure a private `.env` with `MONGO_URI` and a random `JWT_SECRET` of at least 32 characters, then use `npm start`.

## 8. Verification record

- A full backend integration test (`npm test`) passed once earlier, with one top-level test covering multiple role, permission, listing, upload, favorite, enquiry, visit, admin, and reset workflows.
- An earlier full test attempt ended in an out-of-memory error. No full integration run was repeated after later admin/frontend/deployment edits.
- JavaScript syntax checks passed for the recently changed server, Express app, admin seed script, property controller, demo seed, and frontend script at the recorded checkpoints.
- Browser review confirmed the home, account, about, property-detail, and filtered search screens. The Pune / Villa / ₹1–2 Cr filter showed the sample `Baner Courtyard Villa` at ₹1,78,00,000.
- The latest local `/api/health` request returned 503 because MongoDB was disconnected. This current status overrides older successful health-check notes.
- The current Render YAML was reviewed against Render's Blueprint documentation. No Render CLI or local YAML parser is installed, so provider-side Blueprint validation is still pending.

## 9. Deployment status and remaining work

The Render configuration is in `render.yaml` and the deployment prerequisites are in `DEPLOYMENT_REPORT.md`. It targets a Node web service in Singapore, with a paid Starter plan, same-origin URL wiring, generated JWT secret, `/api/health` health check, and secret prompts for Atlas, Cloudinary, and SMTP. No hosting resources have been created and there are no deployment charges.

Remaining work before a real launch:

1. Publish the local `main` branch to the public GitHub repository supplied by the user, then connect it to Render. The local `origin` and initial commit are ready; pushing via Git's HTTPS transport needs GitHub authentication, which was unavailable in this session.
2. Create/configure MongoDB Atlas and allow only the service's documented outbound IP ranges.
3. Add Cloudinary and SMTP credentials through hosting secret settings; do not commit them.
4. Confirm a free preview or paid production plan. Render's free web instances sleep and block common SMTP ports, so they do not support the application's complete sign-up/reset flows.
5. Create the first administrator after the production database is available.
6. Decide whether the illustrative local sample listings should be imported into production, and perform a deliberate migration/seed after Atlas is configured.
7. Deploy, wait for a healthy `/api/health`, then smoke-check registration/email delivery, admin login, listings, enquiries, visits, and photo upload against production services.
8. Set up database backups, monitoring, a custom domain if desired, and a production security review before relying on the site for live transactions.

## 10. Project files

- `index.html`, `properties.html`, `property-details.html`, `about.html`, `contact.html`, account/login/register pages, and `dashboard.html`: site pages.
- `style.css`, `demo.css`, `script.js`, `api-client.js`, `frontend-auth.js`, `dashboard-ui.js`, `dashboard-admin.js`: UI and API integration.
- `server.js`, `backend/`: Express runtime and API implementation.
- `scripts/`: local startup, demo seed, and administrator setup commands.
- `test/backend.test.js`: integration test suite.
- `render.yaml`, `DEPLOYMENT_REPORT.md`: hosted-service configuration and deployment status.
- `student-dashboard/`: separate Vite/React folder; it is not routed or served by the NESTORA Express app.
