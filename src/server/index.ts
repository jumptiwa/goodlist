import "dotenv/config";
import { existsSync } from "node:fs";
import { join } from "node:path";
import express from "express";
import { createDatabase } from "./db.js";
import { createApp } from "./app.js";

const db = createDatabase();
const app = createApp(db);

const clientBuild = join(process.cwd(), "dist");
if (existsSync(clientBuild)) {
  app.use(express.static(clientBuild));
  app.get("*", (_req, res) => res.sendFile(join(clientBuild, "index.html")));
}

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
