import fs from "fs";
import path from "path";
import * as ini from "ini";

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

  // 手动解析配置文件，以确保捕获所有 server_list 段落
  const sections = content.split(/\[\w+.*?\]/g).filter(Boolean);
  const sectionNames = content.match(/\[\w+.*?\]/g) || [];

  for (let i = 0; i < sectionNames.length; i++) {
    const sectionName = sectionNames[i].replace(/[\[\]]/g, "");
    const sectionContent = sections[i];

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
      const serverConfig: MainConfig = {
        port: "25565", // 默认值
      };

      // 解析每一行
      const lines = sectionContent.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const [key, value] = line.split("=").map((part) => part.trim());
        if (key && value) {
          if (key === "port") serverConfig.port = value;
          else if (key === "web_port") serverConfig.web_port = value;
          else if (key === "logLevel") serverConfig.logLevel = value;
          else if (key === "logFormat") serverConfig.logFormat = value;
          else if (key === "host") serverConfig.host = value;
        }
      }

      parsedData.server = serverConfig;
    }
  }

  return parsedData;
}

export const config = loadConfig();
