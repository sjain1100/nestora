# NESTORA

NESTORA is a server-rendered static HTML/CSS/JavaScript real-estate site backed by Express, MongoDB Atlas, and Mongoose. The existing pages and styles remain in the project root. Express serves them from the same origin as the API, so browser requests use HttpOnly session cookies and do not store tokens in `localStorage`.

## Requirements

- Node.js 20.19 or newer, below Node 23
- A MongoDB Atlas cluster and database user
- Cloudinary credentials for persistent production photo uploads (local disk storage is available in development)

## Configure and run

```powershell
npm install
Copy-Item .env.example .env
```

Set `MONGO_URI` to the Atlas connection string and replace `JWT_SECRET` with a unique random string of at least 32 characters. Keep `.env` private; it is ignored by Git. Set `ALLOWED_ORIGINS` to the exact frontend origins if the frontend will be served from a separate origin. Same-origin hosting is the intended setup.

```powershell
npm start
```

Open `http://localhost:5000`. The service exits without starting if its MongoDB connection fails. Check `/api/health` to confirm both the API and MongoDB connection are ready. `npm run dev` runs the same server with nodemon.

`NESTORA_FRONTEND_PREVIEW=true` can serve the static pages without a database during UI work. In that mode API routes are unavailable; it is disabled in production and is not a backend substitute.

## Create the first administrator

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` in `.env`, then run:

```powershell
npm run create-admin
```

The password must be 12–72 characters. The script hashes it before storing it and refuses to change an existing account into an administrator. Public registration only permits buyers, brokers, and sellers. Remove the admin setup variables after creating the account.

## Accounts and workflows

- Create Buyer, Broker, or Seller accounts at `/register.html`, then sign in at `/login.html`.
- A broker can complete a broker profile, submit listings, manage enquiries and visits for their own properties, and upload photos. Listings remain drafts/pending until an administrator verifies the broker and approves the property.
- A seller can create and manage their own listings. Listings become public only after administrator approval.
- Buyers can browse approved listings, save favorites, send property enquiries, request visits, and manage their own account in `/dashboard.html`.
- Administrators sign in through `/admin-login.html`. The admin dashboard reads live API data and supports listing moderation, broker verification, user suspension, enquiry and visit review, and statistics.

New accounts receive an email-verification link when SMTP is configured. In non-production, the API returns a one-use verification token for local testing. Forgot-password requests use the same SMTP settings; without SMTP, non-production responses include a short-lived reset token. Production never returns either token and requires SMTP for account registration and reset email delivery.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `PORT` | HTTP port (default `5000`) |
| `NODE_ENV` | Set to `production` to enable secure cookies and production upload requirements |
| `MONGO_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Random signing secret, at least 32 characters |
| `JWT_EXPIRES_IN` | Session lifetime (default `1h`) |
| `ALLOWED_ORIGINS` | Comma-separated exact origins allowed by CORS and mutation origin checks |
| `FRONTEND_URL`, `APP_URL` | Frontend and reset-link base URLs |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Optional Cloudinary storage credentials; all three enable remote image storage |
| `CLOUDINARY_FOLDER` | Cloudinary folder (default `nestora/properties`) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Optional password-reset email delivery |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Temporary admin seeding inputs for `npm run create-admin` |

Development image uploads use uploads/. Production uploads require Cloudinary. Sellers and brokers can choose up to six photos in the dashboard and preview them before submission. Images are limited to 5 MB each and checked for JPEG, PNG, or WebP signatures. Do not use local disk uploads as persistent storage on ephemeral production hosts.

## API outline

| Area | Routes |
| --- | --- |
| Auth and profile | `/api/auth` |
| Public properties and owner listings | `/api/properties`, `/api/broker` |
| Favorites | `/api/favorites` |
| Enquiries | `/api/inquiries` |
| Visits | `/api/visits` |
| Contact messages | Public: `POST /api/contact` (rate-limited); admin queue: `/api/admin/contact-messages` |
| Administration | `/api/admin` |
| Health | `/api/health` |

All lists are paginated (default 12, maximum 50). Cookie-authenticated mutations require a CSRF token and, when present, an allowed `Origin`. Passwords use bcrypt. JWTs are HttpOnly cookies; logout and password changes invalidate existing tokens through a per-user token version. Protected APIs enforce role and ownership checks server-side.

## Tests

```powershell
npm test
```

The integration suite starts an isolated MongoDB instance with `mongodb-memory-server`; it does not connect to or modify `MONGO_URI`. The first run downloads a MongoDB test binary into the ignored `.test-cache/` folder beside the project and stores the temporary database there. Allow about 2 GB of free space on the project drive. Tests cover role registration and login, email verification, password hashing and reset, CSRF and permissions, broker review, property approval/ownership, image upload, favorites, enquiries, visits, suspension, and the admin API.

## Current limits

- Broker verification is a separate admin-controlled review from email verification.
- The site uses same-origin cookie sessions. A cross-site frontend deployment requires aligned HTTPS origins, cookie policy, CORS, and CSRF configuration.
- Admin changes and selected moderation actions are audit logged. The audit log does not replace operational monitoring, backups, or a production security review.
- Cloudinary and SMTP require credentials supplied by the project owner. Without them, local development uploads work and reset tokens are only exposed in non-production mode.

## Hosted deployment

The Render Blueprint is in `render.yaml`; deployment prerequisites and the current deployment status are documented in `DEPLOYMENT_REPORT.md`. Production requires MongoDB Atlas, Cloudinary, and SMTP credentials configured in the hosting provider's secret settings. Never commit `.env` or paste production secrets into source files.

For the complete product, architecture, data, verification, and remaining-work summary, see `PROJECT_REPORT.md`.

## Local development without Atlas

Run `npm run dev:local` to start the site and API with an isolated local MongoDB database. It does not use `MONGO_URI` from `.env` and does not connect to Atlas. The MongoDB binary is cached in the ignored `.test-cache/mongodb` folder; the local database is stored in the ignored .test-cache/nestora-dev-db-20261122-130654 folder by default and persists across local runs. This mode is for development only. It generates a temporary signing secret, disables SMTP and Cloudinary, uses local image uploads, and returns development-only email tokens. Local accounts and listings stay in the local database and are never sent to Atlas.
## Local sample inventory and photo uploads

Run npm run seed:demo with MONGO_URI pointing to the local development MongoDB to add 13 sample listings across the four cities in the filters: Mumbai, Pune, Bangalore, and Delhi. The inventory includes examples in the available property categories and price bands. The command refuses production and non-local MongoDB hosts. Sample listings are labeled as illustrative and not live offers.

To see listings, open the Properties page. To review contact messages and manage records, sign in through the admin login after creating an administrator. Sellers and brokers can upload up to six JPG, PNG, or WebP photos per listing, up to 5 MB each; the dashboard shows previews before submission. Local uploaded files are stored in uploads/.
