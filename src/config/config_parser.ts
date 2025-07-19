import fs from "fs";
import path from "path";

interface ServerListConfig {
  host: string;
  port: string;
  version: string;
  [key: string]: string; // 允许添加任意字符串键
}

interface MainConfig {
  port: string;
  web_port?: string;
  logLevel?: string;
  logFormat?: string;
  host?: string;
  [key: string]: string | undefined; // 允许添加任意字符串键
}

export interface ParsedConfig {
  server_list: ServerListConfig[];
  server: MainConfig;
}

function loadConfig(): ParsedConfig {
  const configPath = path.join(process.cwd(), "data", "config.ini");
  const content = fs.readFileSync(configPath, "utf-8");

  const parsedData: ParsedConfig = {
    server_list: [],
    server: {
      port: "25565", // 默认端口
      web_port: "8080", // 默认 web 端口
      logLevel: "info", // 默认日志级别
      logFormat: "combined", // 默认日志格式
      host: "0.0.0.0", // 默认主机
    },
  };

  // 使用正则表达式更精确地匹配各个段落
  const sectionRegex = /\[(.*?)\]([\s\S]*?)(?=\[|$)/g;
  let match;

  while ((match = sectionRegex.exec(content)) !== null) {
    const sectionName = match[1].trim();
    const sectionContent = match[2].trim();

    if (sectionName === "server_list") {
      const serverConfig: ServerListConfig = {
        host: "",
        port: "",
        version: "",
      };

      // 解析每一行
      const lines = sectionContent.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const [key, value] = line.split("=").map((part) => part.trim());
        if (key && value) {
          // 直接使用动态属性赋值
          serverConfig[key] = value;
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
          // 直接使用动态属性赋值
          parsedData.server[key] = value;
        }
      }
    }
  }

  return parsedData;
}

export const config = loadConfig();
