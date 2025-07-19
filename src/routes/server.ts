import { Client, ServerStatus, Version } from "@utils/serverListPingAPI";
import express from "express";
import { config } from "../config_loader";
import path from "path";

function initRouter() {
  const SERVER_LIST = config.server_list;

  /**
   * 客户端列表请求
   * 向所有服务端发起Status Request的带缓存的函数
   */
  const clientsList: Array<Client> = [];
  SERVER_LIST.forEach((server) => {
    const client = new Client(server.host, server.port, server.version as Version);
    clientsList.push(client);
  });

  const router = express.Router();
  /* GET users listing. */
  router.get("/", async function (req, res, next) {
    const promises: Promise<ServerStatus>[] = [];
    /* 客户端发起请求 */
    for (let client of clientsList) {
      promises.push(client.getServerStatus());
    }
    /* 等待客户端接收并处理消息 */
    const data: ServerStatus[] = [];
    for (let promise of promises) {
      const res = await promise.catch((err) => {
        console.error(err);
        return null;
      });
      if (res) {
        data.push(res);
      }
    }
    res.send(data);
  });

  return router;
}

export default initRouter;


