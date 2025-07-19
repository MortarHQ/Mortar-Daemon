import fs from "fs";
import path from "path";

interface ServerConfig {
  host: string;
  port: string;
  version: string;
}

interface MainConfig {
  port: string;
  web_port?: string;
  logLevel?: string;
  logFormat?: string;
  host?: string;
}

export interface ParsedConfig {
  server_list: ServerConfig[];
  server: MainConfig;
}

function loadConfig(): ParsedConfig {
  const configPath = path.join(process.cwd(), "data", "config.ini");
  const content = fs.readFileSync(configPath, "utf-8");

  const parsedData: ParsedConfig = {
    server_list: [],
    server: { port: "25565" }, // Default port
  };

  // 使用正则表达式更精确地匹配各个段落
  const sectionRegex = /\[(.*?)\]([\s\S]*?)(?=\[|$)/g;
  let match;

  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
    const sectionContent = match[2].trim();

    if (sectionName === "server_list") {
      const serverConfig: ServerConfig = {
        host: "",
        port: "",
        version: "",
      };

      // 解析每一行
      const lines = sectionContent.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const [key, value] = line.split("=").map((part) => part.trim());
        if (key && value) {
          if (key === "host") serverConfig.host = value;
          else if (key === "port") serverConfig.port = value;
          else if (key === "version") serverConfig.version = value;
        }
      }

      // 只有当有效的服务器配置时才添加
      if (serverConfig.host && serverConfig.port) {
        parsedData.server_list.push(serverConfig);
      }
    } else if (sectionName === "server") {
      // 解析每一行
      const lines = sectionContent.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const [key, value] = line.split("=").map((part) => part.trim());
        if (key && value) {
          if (key === "port") parsedData.server.port = value;
          else if (key === "web_port") parsedData.server.web_port = value;
          else if (key === "logLevel") parsedData.server.logLevel = value;
          else if (key === "logFormat") parsedData.server.logFormat = value;
          else if (key === "host") parsedData.server.host = value;
        }
      }
    }
  }

  return parsedData;
}

export const config = loadConfig();
