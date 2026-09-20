const { createApp } = require("./app");
const { env } = require("./config/env");

const app = createApp();

app.listen(env.port, "127.0.0.1", () => {
  console.log(`Server started on port ${env.port}`);
});
