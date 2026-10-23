// Imported first in index.ts: stops startup with a clear error when required env vars are missing.
import { validateEnv } from "./env";

validateEnv();
