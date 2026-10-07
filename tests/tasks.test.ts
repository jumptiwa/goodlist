import { describe, expect, it } from "vitest";
import { agent, setupTestApp } from "./helpers.js";

const register = (client: ReturnType<typeof agent>, username: string) =>
  client.post("/api/auth/register").send({ username, password: "safe-password" });

describe("tasks", () => {
  it("supports adding, completing, listing, and deleting tasks", async () => {
    const { app } = setupTestApp();
    const client = agent(app);
    await register(client, "taskowner");

    const created = await client.post("/api/tasks").send({ text: "Read a chapter" });
    expect(created.status).toBe(201);
    expect(created.body.task.text).toBe("Read a chapter");
    expect(created.body.task.completed).toBe(0);
    const id = created.body.task.id as number;

    const completed = await client.patch(`/api/tasks/${id}/complete`);
    expect(completed.status).toBe(200);
    expect(completed.body.task.completed).toBe(1);
    expect((await client.get("/api/tasks")).body.tasks).toHaveLength(1);
    expect((await client.delete(`/api/tasks/${id}`)).status).toBe(204);
    expect((await client.get("/api/tasks")).body.tasks).toHaveLength(0);
  });

  it("rejects empty or whitespace-only tasks", async () => {
    const { app } = setupTestApp();
    const client = agent(app);
    await register(client, "emptycheck");
    expect((await client.post("/api/tasks").send({ text: "" })).status).toBe(400);
    expect((await client.post("/api/tasks").send({ text: "   \n " })).status).toBe(400);
    expect((await client.post("/api/tasks").send({ text: "  Valid task  " })).body.task.text).toBe("Valid task");
  });

  it("isolates task access and mutations between two users", async () => {
    const { app } = setupTestApp();
    const alice = agent(app);
    const bob = agent(app);
    await register(alice, "alice");
    await register(bob, "bobuser");
    const aliceTask = await alice.post("/api/tasks").send({ text: "Alice private task" });
    const bobTask = await bob.post("/api/tasks").send({ text: "Bob private task" });
    const aliceId = aliceTask.body.task.id as number;
    const bobId = bobTask.body.task.id as number;

    expect((await alice.get("/api/tasks")).body.tasks.map((task: { text: string }) => task.text)).toEqual(["Alice private task"]);
    expect((await bob.get("/api/tasks")).body.tasks.map((task: { text: string }) => task.text)).toEqual(["Bob private task"]);
    expect((await alice.patch(`/api/tasks/${bobId}/complete`)).status).toBe(404);
    expect((await alice.delete(`/api/tasks/${bobId}`)).status).toBe(404);
    expect((await bob.patch(`/api/tasks/${aliceId}/complete`)).status).toBe(404);
    expect((await bob.delete(`/api/tasks/${aliceId}`)).status).toBe(404);
    expect((await alice.get("/api/tasks")).body.tasks[0].completed).toBe(0);
    expect((await bob.get("/api/tasks")).body.tasks[0].completed).toBe(0);
  });

  it("requires authentication for every task operation", async () => {
    const { app } = setupTestApp();
    const client = agent(app);
    expect((await client.get("/api/tasks")).status).toBe(401);
    expect((await client.post("/api/tasks").send({ text: "No session" })).status).toBe(401);
  });
});
