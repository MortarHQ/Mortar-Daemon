const config = {
  port: process.env.PORT || "8080",  //网站偏移管理界面端口
  host: process.env.HOST || "localhost",  //网站管理界面地址
  logLevel: process.env.LOG_LEVEL || "info",
  logFormat: process.env.LOG_FORMAT || "combined",
  serverPort: process.env.SERVER_PORT || "25565",  //伪造的服务器访问端口
};

if (process.env.NODE_ENV === "development") {
  config.host = "0.0.0.0";
  config.logLevel = "debug";
  config.logFormat = "dev";
  config.serverPort = "25555";  //伪造的服务器访问端口
} else if (process.env.NODE_ENV !== "production") {
  config.serverPort = "25555";  //伪造的服务器访问端口
}

export default config;
