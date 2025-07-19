import pino from "pino";
import dayjs from "dayjs";
import { parseIniConfig } from "../config_loader";
import path from "path";

const configPath = path.join(process.cwd(), 'data', 'config.ini');
const parsedConfig = parseIniConfig(configPath);

const pinoConfig = {
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
    },
  },
  base: {
    pid: false,
  },
  level: parsedConfig.server.logLevel || "info",
  timestamp: () => `,"time":"${dayjs().format()}"`,
} as pino.LoggerOptions;

const log = pino(pinoConfig);

export default log;
