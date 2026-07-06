const { startServer } = require("next/dist/server/lib/start-server");

process.env.NODE_ENV = "development";
process.env.NEXT_TELEMETRY_DISABLED = "1";
process.env.__NEXT_DEV_SERVER = "1";
process.env.NEXT_PRIVATE_WORKER = "1";
process.env.NEXT_PRIVATE_START_TIME = Date.now().toString();

startServer({
  dir: process.cwd(),
  port: Number(process.env.PORT || 3000),
  allowRetry: true,
  isDev: true,
  hostname: "0.0.0.0",
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
