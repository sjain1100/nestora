# NESTORA deployment report

**Status: deployment configuration prepared; the public deployment has not been created.**

## Target architecture

- Render Node web service for the Express frontend and API, served from one HTTPS origin.
- MongoDB Atlas for persistent application records.
- Cloudinary for persistent listing photos.
- SMTP for email verification and password-reset messages.

`render.yaml` defines the service, Node runtime range, production mode, health check, generated JWT secret, and secret environment-variable prompts. Production secret values are deliberately not stored in the deployment configuration or report.

## Production behavior

- The service starts with `npm start` and uses Render's injected `PORT`.
- The health check uses `/api/health` and only reports ready after MongoDB connects.
- The site and API remain same-origin, so the existing HttpOnly cookie and CSRF flows are preserved.
- Production image uploads use Cloudinary; local `uploads/` files are not relied on for persistence.
- The Atlas database starts empty. Local illustrative sample listings and user records are not automatically copied to production.
- Create the first administrator only after deployment, using a unique password and the existing `npm run create-admin` procedure. Do not place the password in this report or commit it to Git.

## Required before the service can start correctly

1. Publish the initial source to the public GitHub repository supplied by the user. The local `main` branch and `origin` remote are configured, and a local initial commit exists. Git's HTTPS push could not authenticate in this session, so the GitHub branch is not populated yet.
2. Create an Atlas database user and database, then supply its URI as `MONGO_URI`. Restrict the Atlas IP access list to the hosting service's outbound IP ranges; do not use `0.0.0.0/0`.
3. Supply Cloudinary credentials for persistent photo uploads.
4. Supply a production SMTP host and credentials so registration verification and password reset can send mail.
5. Select the Render service plan. The current blueprint targets `starter` for an always-on production service; creating it incurs monthly hosting charges. No service has been provisioned and no charges have started.
6. After the Render URL exists, confirm its generated origin values, create the admin account, and decide whether the illustrative demo properties should be imported into the production database.

## Verification completed

- A local health check first returned ready, but the latest request returned `503` with `MongoDB is not connected`. The local preview is currently not healthy; it was left running and not restarted to avoid disturbing the existing local database.
- `node --check` passed for `server.js`, `backend/app.js`, and `scripts/seed-admin.js`; `package.json` parsed successfully with the configured Node range. The Render YAML was reviewed against the current Blueprint docs; no Render CLI or YAML parser is installed here.
- Render's official deployment documentation was checked for the Node web-service, health-check, environment-secret, runtime, and free-tier behavior.
- No production deployment, data migration, account creation, or paid resource provisioning was performed.
- The project integration suite was not run as part of this preparation.
