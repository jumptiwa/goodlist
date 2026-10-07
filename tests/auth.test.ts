import { describe, expect, it } from "vitest";
import { agent, setupTestApp } from "./helpers.js";

describe("authentication", () => {
  it("registers, logs in, and logs out with a valid session", async () => {
    const { app, db } = setupTestApp();
    const client = agent(app);

    const registration = await client.post("/api/auth/register").send({ username: "alice_1", password: "safe-password" });
    expect(registration.status).toBe(201);
    expect(registration.body.user.username).toBe("alice_1");
    const storedHash = db.prepare("SELECT password_hash FROM users WHERE username = ?").get("alice_1") as { password_hash: string };
    expect(storedHash.password_hash).not.toBe("safe-password");
    expect(storedHash.password_hash).toMatch(/^\$argon2id\$/);
    expect((await client.get("/api/auth/me")).status).toBe(200);

    await client.post("/api/auth/logout");
    expect((await client.get("/api/auth/me")).status).toBe(401);
    expect((await client.post("/api/auth/login").send({ username: "alice_1", password: "safe-password" })).status).toBe(200);
    expect((await client.post("/api/auth/login").send({ username: "alice_1", password: "wrong-password" })).status).toBe(401);
  });

  it("rejects invalid credentials and duplicate usernames", async () => {
    const { app } = setupTestApp();
    const client = agent(app);
    expect((await client.post("/api/auth/register").send({ username: "ab", password: "safe-password" })).status).toBe(400);
    expect((await client.post("/api/auth/register").send({ username: "alice", password: "short" })).status).toBe(400);
    expect((await client.post("/api/auth/register").send({ username: "alice", password: "safe-password" })).status).toBe(201);
    expect((await client.post("/api/auth/register").send({ username: "alice", password: "safe-password" })).status).toBe(409);
  });
});
