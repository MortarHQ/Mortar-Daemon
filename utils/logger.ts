import pino from "pino";
import dayjs from "dayjs";
import config from "config";

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
  level: config.get<string>("logLevel"),
  timestamp: () => `,"time":"${dayjs().format()}"`,
} as pino.LoggerOptions;

const log = pino(pinoConfig);

export default log;
