import { createHash, randomBytes } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import type Database from "better-sqlite3";

export const SESSION_COOKIE = "task_session";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type AuthenticatedRequest = Request & { userId?: number; username?: string };

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createSession(db: Database.Database, userId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + SESSION_DURATION_MS;
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)")
    .run(hashSessionToken(token), userId, expiresAt);
  return { token, expiresAt };
}

export function requireAuth(db: Database.Database) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== "string" || token.length === 0) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    const session = db.prepare(`
      SELECT users.id AS user_id, users.username
      FROM sessions JOIN users ON users.id = sessions.user_id
      WHERE sessions.token_hash = ? AND sessions.expires_at > ?
    `).get(hashSessionToken(token), Date.now()) as { user_id: number; username: string } | undefined;
    if (!session) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    req.userId = session.user_id;
    req.username = session.username;
    next();
  };
}
