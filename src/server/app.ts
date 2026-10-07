import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import type Database from "better-sqlite3";
import { authRoutes } from "./routes/auth.js";
import { taskRoutes } from "./routes/tasks.js";

export function createApp(db: Database.Database) {
  const app = express();
  app.disable("x-powered-by");
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(express.json({ limit: "16kb" }));
  app.use(cookieParser());
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.use("/api/auth", authRoutes(db));
  app.use("/api/tasks", taskRoutes(db));
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("Request failed:", error);
    res.status(500).json({ error: "An unexpected server error occurred" });
  });
  return app;
}
