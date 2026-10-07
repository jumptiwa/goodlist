import { FormEvent, useEffect, useState } from "react";
import { api, Task, User } from "./api";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [newTask, setNewTask] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function refreshTasks() {
    const result = await api.tasks();
    setTasks(result.tasks);
  }

  useEffect(() => {
    api.me()
      .then(async ({ user: currentUser }) => {
        setUser(currentUser);
        await refreshTasks();
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function authenticate(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const result = mode === "login"
        ? await api.login(username, password)
        : await api.register(username, password);
      setUser(result.user);
      setPassword("");
      await refreshTasks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in");
    }
  }

  async function addTask(event: FormEvent) {
    event.preventDefault();
    const text = newTask.trim();
    if (!text) return;
    setError("");
    try {
      const result = await api.addTask(text);
      setTasks((current) => [result.task, ...current]);
      setNewTask("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to add task");
    }
  }

  async function toggleTask(task: Task) {
    setError("");
    try {
      const result = await api.toggleTask(task.id);
      setTasks((current) => current.map((item) => item.id === task.id ? result.task : item));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to update task");
    }
  }

  async function deleteTask(id: number) {
    setError("");
    try {
      await api.deleteTask(id);
      setTasks((current) => current.filter((task) => task.id !== id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to delete task");
    }
  }

  async function logout() {
    try {
      await api.logout();
      setUser(null);
      setTasks([]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to log out");
    }
  }

  if (loading) return <main className="page"><p className="loading">Getting things ready...</p></main>;

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Private Tasks home">
          <span className="brand-mark">✓</span> goodlist
        </a>
        {user && <div className="account"><span>{user.username}</span><button className="text-button" onClick={logout}>Log out</button></div>}
      </header>

      {!user ? (
        <section className="auth-card">
          <div className="eyebrow">A little more focus</div>
          <h1>{mode === "login" ? "Welcome back." : "Make space to do."}</h1>
          <p className="subheading">Your tasks, just for you.</p>
          {error && <div className="notice" role="alert">{error}</div>}
          <form onSubmit={authenticate} className="auth-form">
            <label htmlFor="username">Username</label>
            <input id="username" autoComplete="username" minLength={3} maxLength={32} value={username} onChange={(event) => setUsername(event.target.value)} required />
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} required />
            <button className="primary-button" type="submit">{mode === "login" ? "Log in" : "Create account"} <span>→</span></button>
          </form>
          <p className="switch-mode">
            {mode === "login" ? "New around here?" : "Already have an account?"}{" "}
            <button className="text-button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
              {mode === "login" ? "Create an account" : "Log in"}
            </button>
          </p>
        </section>
      ) : (
        <section className="tasks-view">
          <div className="eyebrow">YOUR PERSONAL SPACE</div>
          <h1>A clear mind<br />starts here.</h1>
          <p className="subheading">One thing at a time. You’ve got this.</p>
          {error && <div className="notice" role="alert">{error}</div>}
          <form className="add-task" onSubmit={addTask}>
            <span className="add-icon">＋</span>
            <input aria-label="New task" placeholder="What needs your attention?" value={newTask} maxLength={500} onChange={(event) => setNewTask(event.target.value)} />
            <button type="submit" disabled={!newTask.trim()}>Add task</button>
          </form>
          <div className="list-header">
            <h2>Your list</h2><span>{tasks.filter((task) => !task.completed).length} to focus on</span>
          </div>
          {tasks.length === 0 ? (
            <div className="empty-state"><span className="empty-spark">✳</span><p>Nothing on your list yet.</p><span>Add a task when you’re ready.</span></div>
          ) : (
            <ul className="task-list">
              {tasks.map((task) => (
                <li className={`task-row${task.completed ? " is-complete" : ""}`} key={task.id}>
                  <button className="check-button" aria-label={task.completed ? `Mark ${task.text} incomplete` : `Complete ${task.text}`} onClick={() => toggleTask(task)}>
                    {task.completed ? "✓" : ""}
                  </button>
                  <span className="task-text">{task.text}</span>
                  <button className="delete-button" aria-label={`Delete ${task.text}`} onClick={() => deleteTask(task.id)}>×</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
      <footer>Small steps count.</footer>
    </main>
  );
}
