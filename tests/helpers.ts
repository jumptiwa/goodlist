import request from "supertest";
import { afterEach } from "vitest";
import { createApp } from "../src/server/app.js";
import { createDatabase } from "../src/server/db.js";

const databases: ReturnType<typeof createDatabase>[] = [];

export function setupTestApp() {
  const db = createDatabase(":memory:");
  databases.push(db);
  return { app: createApp(db), db };
}

export function agent(app: ReturnType<typeof createApp>) {
  return request.agent(app);
}

afterEach(() => {
  for (const db of databases.splice(0)) db.close();
});
