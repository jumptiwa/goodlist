import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/server/app.js";
import { createDatabase } from "../src/server/db.js";

const app = createApp(createDatabase());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const url = req.url ?? "/";
  const pathname = new URL(url, "http://localhost").pathname;
  if (pathname !== "/api" && !pathname.startsWith("/api/")) {
    req.url = `/api${url.startsWith("/") ? "" : "/"}${url}`;
  }
  return app(req, res);
}
