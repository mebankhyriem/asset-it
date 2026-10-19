# IT Asset Management

Next.js application for managing IT assets, assignments, requests, approvals, maintenance, and inventory.

## Requirements

- Node.js 20 or newer
- npm
- MySQL 8 or a compatible managed MySQL service
- A Node.js host that supports long-running Next.js servers

The application currently serves its own API from Next.js and connects directly to MySQL. The Express service in `backend/` is an early scaffold and is not required to run the application.

## Run locally

From the repository root:

```sh
npm install
```

Create a MySQL database and apply the schema:

```sh
mysql -u YOUR_DB_USER -p YOUR_DB_NAME < frontend/lib/db/schema.sql
```

Create `frontend/.env.local` with the connection URL and a unique session signing secret:

```dotenv
DATABASE_URL=mysql://YOUR_DB_USER:YOUR_DB_PASSWORD@YOUR_DB_HOST:3306/YOUR_DB_NAME
SESSION_SECRET=replace-with-a-long-random-secret
```

Generate a secret with `openssl rand -base64 32`. Keep credentials out of Git and use your host's secret/environment-variable settings in production.

Start the app:

```sh
npm run dev -w frontend
```

Open <http://localhost:3000>.

## Deploy

Deploy the repository as a Node.js service. Use the repository root as the project directory, `npm run build` as the build command, and `npm run start -w frontend` as the start command. Configure `DATABASE_URL` and `SESSION_SECRET` in the hosting provider, and apply `frontend/lib/db/schema.sql` to the production database before the first launch.

The database schema creates tables only; it does not create an initial administrator. Provision the first account through your organization's trusted database setup process before using the login page. Do not expose a database or seed password in a public repository.

Uploaded documents and photos are stored under `frontend/data/uploads/`. Configure persistent storage for that directory on hosts with ephemeral filesystems, or uploads may be lost when instances restart or redeploy. Back up the database and uploaded files.

## Build

```sh
npm run build
npm run lint -w frontend
```