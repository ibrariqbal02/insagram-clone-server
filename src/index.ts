import "./config/checkEnv";
import connectMongoose from "./config/database";
import app from "./app";
import { getPort } from "./config/env";

const PORT = getPort();

connectMongoose()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB, server not started:", err.message);
    process.exit(1);
  });
