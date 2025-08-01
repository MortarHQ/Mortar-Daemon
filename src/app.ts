import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import initRouter from "@routes";
import initMiddleWare from "@middleware";
import log from "@utils/logger";
import { config } from "./config/config_parser";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

const app = express();

// 视图引擎设置
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// 中间件
initMiddleWare(app);
app.use(morgan(config.server.logFormat || "combined"));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// 静态文件服务
app.use(express.static(path.join(process.cwd(), "public")));

// 路由
app.use(initRouter());
log.info("Router initialized and used by app.");

export default app;

