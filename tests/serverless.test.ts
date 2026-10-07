import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";

let app: (req: IncomingMessage, res: ServerResponse) => void;

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
    expect((await client.post("/api/auth/login").send({
      username: "verceluser",
      password: "safe-password"
    })).status).toBe(200);
  });

  it("normalizes paths when the serverless runtime strips the /api function prefix", async () => {
    const client = request.agent(app);

    expect((await client.get("/health")).status).toBe(200);
    expect((await client.post("/auth/register").send({
      username: "strippeduser",
      password: "safe-password"
    })).status).toBe(201);

    const created = await client.post("/tasks").send({ text: "Handle rewritten path" });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id as number;
    expect((await client.patch(`/tasks/${taskId}/complete`)).body.task.completed).toBe(1);
    expect((await client.delete(`/tasks/${taskId}`)).status).toBe(204);
    expect((await client.post("/auth/logout")).status).toBe(204);
    expect((await client.post("/auth/login").send({
      username: "strippeduser",
      password: "safe-password"
    })).status).toBe(200);
  });
});
