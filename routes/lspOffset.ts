import express from "express";
import { StatusCodes } from "http-status-codes";
import config from "config";

const router = express.Router();
const LSPOFFSET = "/lspoffset";
const lspOffsetCache = {};

const host = config.get<String>("host");
const port = config.get<String>("port");
const addr = `http://${host}:${port}`;

router.put(LSPOFFSET, (req, res, next) => {
  // 清空lspOffsetCache
  Object.keys(lspOffsetCache).forEach((key) => {
    // @ts-ignore
    delete lspOffsetCache[key];
  });
  // 将lspOffset缓存
  Object.assign(lspOffsetCache, req.body);
  res.sendStatus(StatusCodes.OK);
});
router.get(LSPOFFSET, (req, res, next) => {
  res.send(lspOffsetCache);
});

/* 偏移测试 */
router.get(`${LSPOFFSET}/testput`, (req, res, next) => {
  fetch(`${addr}${LSPOFFSET}`, {
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

export default router;
export { LSPOFFSET };
