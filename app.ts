import express from "express";
import path from "path";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import config from "config";
import routes from "@routes/index";

const __filename = import.meta.filename;
const __dirname = import.meta.dirname;

const app = express();

app.use(morgan(config.get<string>("logFormat")));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));
app.use(routes);

export default app;
