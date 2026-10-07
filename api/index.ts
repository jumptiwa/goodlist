import type { IncomingMessage, ServerResponse } from "node:http";
import { createApp } from "../src/server/app.js";
import { createDatabase } from "../src/server/db.js";

const app = createApp(createDatabase());

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const requestUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const apiPath = requestUrl.searchParams.get("__api_path");

  if (apiPath !== null) {
    const pathname = apiPath ? `/api/${apiPath.replace(/^\/+/, "")}` : "/api";
    requestUrl.searchParams.delete("__api_path");
    req.url = `${pathname}${requestUrl.search}`;
  }

  return app(req, res);
}
