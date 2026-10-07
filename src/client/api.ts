export type User = { id: number; username: string };
export type Task = { id: number; text: string; completed: number; created_at: string };

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...init?.headers }
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const api = {
  me: () => request<{ user: User }>("/auth/me"),
  register: (username: string, password: string) =>
    request<{ user: User }>("/auth/register", { method: "POST", body: JSON.stringify({ username, password }) }),
  login: (username: string, password: string) =>
    request<{ user: User }>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  tasks: () => request<{ tasks: Task[] }>("/tasks"),
  addTask: (text: string) =>
    request<{ task: Task }>("/tasks", { method: "POST", body: JSON.stringify({ text }) }),
  toggleTask: (id: number) =>
    request<{ task: Task }>(`/tasks/${id}/complete`, { method: "PATCH" }),
  deleteTask: (id: number) => request<void>(`/tasks/${id}`, { method: "DELETE" })
};
