const config = {
  port: process.env.PORT || "8080",
  host: process.env.HOST || "localhost",
  logLevel: process.env.LOG_LEVEL || "info",
  logFormat: process.env.LOG_FORMAT || "combined",
  serverPort: process.env.SERVER_PORT || "25565",
};

if (process.env.NODE_ENV === "development") {
  config.host = "0.0.0.0";
  config.logLevel = "debug";
  config.logFormat = "dev";
  config.serverPort = "25555";
} else if (process.env.NODE_ENV !== "production") {
  config.serverPort = "25555";
}

export default config;
