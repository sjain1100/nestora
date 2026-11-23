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

- **Local development:** the app's local database is named `nestora_dev`. Its persistent files are under `D:\WT\.test-cache\nestora-dev-db-20261122-130654`. Start the local API and MongoDB together with `npm run dev:local`, then connect MongoDB Compass to the exact `MongoDB Compass URI` printed by the command. The previous run used `mongodb://127.0.0.1:56890/nestora_dev`; the port can change when the local database restarts. In Compass, open collections such as `properties`, `users`, `favorites`, `enquiries`, `visits`, and `contactmessages`.
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

- All 66 NESTORA source files, including the Express backend, safe database-error handling, and Render Blueprint, are published on GitHub `main`. `.env`, database files, uploads, and dependencies are excluded.
- The backend integration suite passed (1 test) against its isolated temporary MongoDB. It did not connect to or modify Atlas. JavaScript syntax checks passed for `server.js`, `api-client.js`, and `backend/middleware/security.js`.
- Production startup now checks for the required Atlas, Cloudinary, and SMTP setting names and reports missing names without printing secret values.
- The current local API health is still `503` because MongoDB is disconnected. The live Atlas connection has not been verified, and no production data has been migrated.
- Atlas access, fresh database credentials, Cloudinary, and SMTP still need to be configured privately. No admin account, Render service, or paid resource has been created; there are no hosting charges.
