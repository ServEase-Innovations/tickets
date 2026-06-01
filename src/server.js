import "./config/env.js";
import app from "./app.js";
import config from "./config/env.js";

app.listen(config.port, "0.0.0.0", () => {
  console.log(`🎫 Tickets service on port ${config.port}`);
});
