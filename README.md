# goodlist

A full-stack task app with a React frontend, Express API, and SQLite storage.

## Features

- Username/password registration and login with Argon2id password hashes
- HttpOnly, SameSite session cookies
- User-scoped task listing, creation, completion, and deletion
- Server-side validation against empty tasks

## Run locally

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev
```

Open the Vite URL printed by the development server. Vite proxies `/api` requests to the Express server on port 3000. To run the production frontend through Express locally:

```sh
npm run build
npm start
```

The local SQLite database is created at `data/tasks.sqlite`. Set `DATABASE_PATH` to use a different file. Do not commit `.env` files or database files.

## Deploy to Vercel

Import this repository into Vercel. The Vite build serves the frontend as static assets, while `api/[...path].ts` routes API requests to the Express app as a Vercel Node.js Function. The handler normalizes the `/api` prefix because function runtimes may pass the matched catch-all path with that prefix removed. The API function implements registration, login, logout, session lookup, and user-scoped task operations.

The demo defaults to `/tmp/goodlist.sqlite` on Vercel because the deployment filesystem is read-only except for temporary storage. That file is **ephemeral**: it may be removed when an instance is recycled, and separate serverless instances do not share it. Accounts, sessions, and tasks can therefore disappear or appear inconsistent. This setup is only suitable for trying the demo, not for reliable production data.

**Production deployments should use a hosted persistent database** (for example, a managed PostgreSQL service) and a shared, durable session store. Do not rely on Vercel's temporary filesystem for user accounts or tasks. If the SQLite demo database is stored at a custom location, set `DATABASE_PATH` only to a writable temporary location on Vercel.

## Validate

```sh
npm test
npm run build
```
