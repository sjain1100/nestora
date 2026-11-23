# NESTORA deployment report

**Status: source published to GitHub; deployment configuration prepared; production hosting and database are not deployed.**

Repository: [sjain1100/nestora](https://github.com/sjain1100/nestora), branch `main`.

## Architecture

- Render Node web service for Express pages and API, served from one HTTPS origin.
- MongoDB Atlas for production application records.
- Cloudinary for persistent production listing photos.
- SMTP for email verification and password-reset messages.

`render.yaml` defines the Render service, Singapore region, `starter` compute plan, build/start commands, `/api/health` health check, generated JWT secret, same-origin URLs, and secret environment-variable prompts. The Starter compute plan is paid. No Render service has been provisioned and no hosting charges have started.

## Where the data is

- **Local development:** the app's local database is named `nestora_dev`. Its persistent files are under `D:\WT\.test-cache\nestora-dev-db-20261122-130654`. Start the local API and MongoDB together with `npm run dev:local`, then connect MongoDB Compass to `mongodb://127.0.0.1:56890/nestora_dev`. In Compass, open collections such as `properties`, `users`, `favorites`, `enquiries`, `visits`, and `contactmessages`.
- **Current local status:** a check of `http://127.0.0.1:5000/api/health` returned `503` with MongoDB disconnected. The API therefore cannot currently read the local database. If another server is already using port 5000, stop it before starting `npm run dev:local`.
- **Production:** no Atlas database is configured and no local records have been migrated. After setting `MONGO_URI`, production records will live in that Atlas deployment; view them in Atlas **Database → Data Explorer**. Production photos should be stored in Cloudinary.
- **GitHub is source code storage, not the application database.** `.env`, the local database/cache, `uploads/`, and `node_modules/` are excluded from the repository.

## Deployment steps

1. Create a MongoDB Atlas deployment and a database user. Use its connection string for Render's `MONGO_URI`. Once the Render service exists, allowlist its current outbound IP ranges in Atlas. Keep the list restricted; do not use `0.0.0.0/0`.
2. Create a Cloudinary account and provide `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in Render's environment settings.
3. Provide production SMTP settings in Render for registration verification and password-reset email.
4. In Render, create a Blueprint from [the GitHub repository](https://github.com/sjain1100/nestora), using branch `main` and the root `render.yaml`. Review its paid Starter plan and configure the prompted secrets before applying it.
5. After deployment, open the Render URL and verify `/api/health` reports the API and MongoDB as ready. Create the first administrator privately after the Atlas database is connected. Decide separately whether to add the illustrative demo listings to production.

Render's free web services sleep after 15 minutes without inbound traffic, have ephemeral local filesystems, and cannot send outbound SMTP traffic on ports 25, 465, or 587. The current application configuration is set to the paid Starter plan; a free preview would need a separate configuration and would not provide the configured SMTP path.

## Verification and remaining work

- All 66 committed project files, including the Express backend and `render.yaml`, are published on GitHub `main`. Local `.env`, database files, uploads, and dependencies are absent from the remote tree.
- Current local API health is `503` because MongoDB is disconnected.
- Atlas, Cloudinary, and SMTP production credentials have not been configured. No production records were imported, no administrator was created, and no deployment or paid service was started.
- Previous JavaScript syntax checks passed for `server.js`, `backend/app.js`, and `scripts/seed-admin.js`. The full integration suite was not rerun for this publication.
