import "dotenv/config";
import app from "./app.js";
import { initWebSocketServer } from "./ws/server.js";

const port = process.env.PORT ? Number(process.env.PORT) : 4000;

const server = app.listen(port, () => {
  console.log(`API listening on port ${port}`);
});

initWebSocketServer(server);
