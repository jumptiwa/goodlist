import { Router } from "express";
import argon2 from "argon2";
import type Database from "better-sqlite3";
import { createSession, hashSessionToken, requireAuth, SESSION_COOKIE } from "../auth.js";
import type { AuthenticatedRequest } from "../auth.js";
import { validatePassword, validateUsername } from "../validation.js";

let dummyPasswordHash: Promise<string> | undefined;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/"
};

export function authRoutes(db: Database.Database) {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    const username = validateUsername(req.body?.username);
    const password = validatePassword(req.body?.password);
    if (!username || !password) {
      res.status(400).json({ error: "Username must be 3–32 letters, numbers, or underscores; password must be 8–128 characters" });
      return;
    }
    try {
      const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
      const result = db.prepare("INSERT INTO users (username, password_hash) VALUES (?, ?)")
        .run(username, passwordHash);
      const userId = Number(result.lastInsertRowid);
      const session = createSession(db, userId);
      res.cookie(SESSION_COOKIE, session.token, { ...COOKIE_OPTIONS, expires: new Date(session.expiresAt) });
      res.status(201).json({ user: { id: userId, username } });
    } catch (error) {
      if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
        res.status(409).json({ error: "That username is already taken" });
        return;
      }
      next(error);
    }
  });

  router.post("/login", async (req, res, next) => {
    const username = validateUsername(req.body?.username);
    const password = validatePassword(req.body?.password);
    if (!username || !password) {
      res.status(400).json({ error: "Enter a valid username and password" });
      return;
    }
    try {
      const user = db.prepare("SELECT id, username, password_hash FROM users WHERE username = ?")
        .get(username) as { id: number; username: string; password_hash: string } | undefined;
      const validPassword = user
        ? await argon2.verify(user.password_hash, password)
        : await argon2.verify(
            await (dummyPasswordHash ??= argon2.hash("invalid-login-placeholder", { type: argon2.argon2id })),
            password
          );
      if (!user || !validPassword) {
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }
      const session = createSession(db, user.id);
      res.cookie(SESSION_COOKIE, session.token, { ...COOKIE_OPTIONS, expires: new Date(session.expiresAt) });
      res.json({ user: { id: user.id, username: user.username } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", (req, res) => {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === "string") {
      db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashSessionToken(token));
    }
    res.clearCookie(SESSION_COOKIE, COOKIE_OPTIONS);
    res.status(204).end();
  });

  router.get("/me", requireAuth(db), (req: AuthenticatedRequest, res) => {
    res.json({ user: { id: req.userId, username: req.username } });
  });

  return router;
}
