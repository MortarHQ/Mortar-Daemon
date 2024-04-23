import express from "express";
import { StatusCodes } from "http-status-codes";
import config from "config";
import { RouterName } from "@routes";

function initRouter() {
  const router = express.Router();
  const OFFSET = `/${RouterName.OFFSET}`;

  const host = config.get<String>("host");
  const port = config.get<String>("port");
  const addr = `http://${host}:${port}`;

  const offsetCache = {};

  router.put(OFFSET, (req, res, next) => {
    // 清空offsetCache
    Object.keys(offsetCache).forEach((key) => {
      // @ts-ignore
      delete offsetCache[key];
    });
    // 将offset缓存
    Object.assign(offsetCache, req.body);
    res.sendStatus(StatusCodes.OK);
  });

  router.get(OFFSET, (req, res, next) => {
    res.send(offsetCache);
  });

  /* 偏移测试 */
  router.get(`${OFFSET}/testput`, (req, res, next) => {
    fetch(`${addr}${OFFSET}`, {
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
