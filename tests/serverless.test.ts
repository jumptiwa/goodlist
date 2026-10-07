import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { IncomingMessage, ServerResponse } from "node:http";

let app: (req: IncomingMessage, res: ServerResponse) => void;
const vercelConfig = JSON.parse(
  readFileSync(fileURLToPath(new URL("../vercel.json", import.meta.url)), "utf8")
) as {
  rewrites: { source: string; destination: string }[];
};

beforeAll(async () => {
  const previousDatabasePath = process.env.DATABASE_PATH;
  process.env.DATABASE_PATH = ":memory:";
  try {
    ({ default: app } = await import("../api/index.js"));
  } finally {
    if (previousDatabasePath === undefined) delete process.env.DATABASE_PATH;
    else process.env.DATABASE_PATH = previousDatabasePath;
  }
});

function vercelTarget(publicPath: string) {
  const rewrite = vercelConfig.rewrites.find((rule) => rule.source === "/api/:path*");
  if (!rewrite) throw new Error("Vercel API rewrite is not configured");
  if (!publicPath.startsWith("/api/")) throw new Error("Expected a public /api path");

  const route = publicPath.slice("/api/".length);
  const target = rewrite.destination.replace(":path*", route);
  const targetUrl = new URL(target, "http://localhost");
  return `${targetUrl.pathname}${targetUrl.search}`;
}

function send(
  client: ReturnType<typeof request.agent>,
  method: "get" | "post" | "patch" | "delete",
  publicPath: string,
  body?: Record<string, string>
) {
  const call = client[method](vercelTarget(publicPath));
  return body === undefined ? call : call.send(body);
}

describe("Vercel serverless API", () => {
  it("routes the exact public registration path through the Vercel rewrite", async () => {
    expect(vercelConfig.rewrites).toContainEqual({
      source: "/api/:path*",
      destination: "/api?__api_path=:path*"
    });

    const client = request.agent(app);
    expect((await send(client, "post", "/api/auth/register", {
      username: "verceluser",
      password: "safe-password"
    })).status).toBe(201);
    expect((await send(client, "post", "/api/auth/logout", {})).status).toBe(204);
  });

  it("serves login, logout, and task endpoints through the Vercel rewrite", async () => {
    const client = request.agent(app);

    expect((await send(client, "get", "/api/health")).status).toBe(200);
    expect((await send(client, "post", "/api/auth/register", {
      username: "verceluser2",
      password: "safe-password"
    })).status).toBe(201);

    const created = await send(client, "post", "/api/tasks", { text: "Check deployed API" });
    expect(created.status).toBe(201);
    const taskId = created.body.task.id as number;

    expect((await send(client, "patch", `/api/tasks/${taskId}/complete`)).body.task.completed).toBe(1);
    expect((await send(client, "delete", `/api/tasks/${taskId}`)).status).toBe(204);
    expect((await send(client, "post", "/api/auth/logout", {})).status).toBe(204);
    expect((await send(client, "get", "/api/tasks")).status).toBe(401);
    expect((await send(client, "post", "/api/auth/login", {
      username: "verceluser2",
      password: "safe-password"
    })).status).toBe(200);
  });
});
