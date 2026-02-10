import { config } from "dotenv";
import path from "path";

// Load .env from project root into process.env.
// This runs before every test file, so spawned child processes inherit these vars.
config({ path: path.resolve(import.meta.dirname, "../.env") });
