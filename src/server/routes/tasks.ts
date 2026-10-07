import { Router } from "express";
import type Database from "better-sqlite3";
import type { AuthenticatedRequest } from "../auth.js";
import type { Task } from "../db.js";
import { requireAuth } from "../auth.js";
import { validateTaskText } from "../validation.js";

export function taskRoutes(db: Database.Database) {
  const router = Router();
  router.use(requireAuth(db));

  router.get("/", (req: AuthenticatedRequest, res) => {
    const tasks = db.prepare(`
      SELECT id, text, completed, created_at
      FROM tasks WHERE user_id = ? ORDER BY id DESC
    `).all(req.userId) as Task[];
    res.json({ tasks });
  });

  router.post("/", (req: AuthenticatedRequest, res) => {
    const text = validateTaskText(req.body?.text);
    if (!text) {
      res.status(400).json({ error: "Task text must be between 1 and 500 characters" });
      return;
    }
    const result = db.prepare("INSERT INTO tasks (user_id, text) VALUES (?, ?)")
      .run(req.userId, text);
    const task = db.prepare(`
      SELECT id, text, completed, created_at FROM tasks WHERE id = ? AND user_id = ?
    `).get(result.lastInsertRowid, req.userId) as Task;
    res.status(201).json({ task });
  });

  router.patch("/:id/complete", (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }
    const result = db.prepare(`
      UPDATE tasks SET completed = CASE completed WHEN 0 THEN 1 ELSE 0 END
      WHERE id = ? AND user_id = ?
    `).run(id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    const task = db.prepare(`
      SELECT id, text, completed, created_at FROM tasks WHERE id = ? AND user_id = ?
    `).get(id, req.userId) as Task;
    res.json({ task });
  });

  router.delete("/:id", (req: AuthenticatedRequest, res) => {
    const id = Number(req.params.id);
    if (!Number.isSafeInteger(id) || id < 1) {
      res.status(400).json({ error: "Invalid task ID" });
      return;
    }
    const result = db.prepare("DELETE FROM tasks WHERE id = ? AND user_id = ?")
      .run(id, req.userId);
    if (result.changes === 0) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.status(204).end();
  });

  return router;
}
