import express from "express";
import { StatusCodes } from "http-status-codes";
import { config } from "../config/config_parser";

function initRouter() {
  const router = express.Router();

  const host = config.server.host || "localhost";
  const port = config.server.web_port;
  const addr = `http://${host}:${port}`;

  const offsetCache = {};

  router.put("/", (req, res, next) => {
    // 清空offsetCache
    Object.keys(offsetCache).forEach((key) => {
      // @ts-ignore
      delete offsetCache[key];
    });
    // 将offset缓存
    Object.assign(offsetCache, req.body);
    res.sendStatus(StatusCodes.OK);
  });

  router.get("/", (req, res, next) => {
    res.send(offsetCache);
  });

  /* 偏移测试 */
  router.get("/testput", (req, res, next) => {
    fetch(`${addr}/offset`, {
      method: "put",
      headers: Object.assign(
        { "Content-Type": "application/json" },
        req.headers
      ) as RequestInit["headers"],
      body: JSON.stringify({ test: "hello world!" }),
    })
      .then((data) => {
        res.send(data);
      })
      .catch((error) => {
        res.send(error);
      });
  });

  return router;
}

export default initRouter;
