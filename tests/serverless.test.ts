import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  const previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = ":memory:";
  try {
    ({ default: app } = await import("../api/[...path].js"));
  } finally {
    if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousDatabasePath;
  }
});

describe("Vercel serverless API", () => {
  it("serves authenticated task operations through the catch-all handler", async () => {
    const client = request.agent(app);

    expect((await client.get("/api/health")).status).toBe(200);
    expect((await client.post("/api/auth/register").send({
      username: "verceluser",
      password: "safe-password"
    })).status).toBe(201);

    const created = await client.post("/api/tasks").send({ text: "Check deployed API" });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id as number;

    expect((await client.patch(`/api/tasks/${taskId}/complete`)).body.task.completed).toBe(1);
    expect((await client.delete(`/api/tasks/${taskId}`)).status).toBe(204);
    expect((await client.post("/api/auth/logout")).status).toBe(204);
    expect((await client.get("/api/tasks")).status).toBe(401);
  });
});
