// Runs before the test framework is installed (Jest `setupFiles`), so it can
// set env vars before any app module (and `tests/setup.ts`) is imported.
import dotenv from "dotenv";
dotenv.config();

// Pin the in-memory MongoDB binary version: newer mongod builds link against
// libc++ symbols that are missing on older macOS releases and crash with
// SIGABRT on startup. 7.0.x is broadly compatible.
process.env.MONGOMS_VERSION = process.env.MONGOMS_VERSION || "7.0.14";
