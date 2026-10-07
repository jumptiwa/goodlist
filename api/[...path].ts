import { createApp } from "../src/server/app.js";
import { createDatabase } from "../src/server/db.js";

const app = createApp(createDatabase());

export default app;
