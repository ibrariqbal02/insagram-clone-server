import "./config/checkEnv";
import http from "http";
import connectMongoose from "./config/database";
import app from "./app";
import { getPort } from "./config/env";
import { initSocket } from "./socket";

const PORT = getPort();

const httpServer = http.createServer(app);
initSocket(httpServer);

connectMongoose()
  .then(() => {
    httpServer.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB, server not started:", err.message);
    process.exit(1);
  });
