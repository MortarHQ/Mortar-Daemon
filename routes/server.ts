import { SERVER_LIST } from "@config/minecraft";
import { RouterName } from "@routes";
import { Client, ServerStatus, Version } from "@utils/serverListPingAPI";
import express from "express";

function initRouter() {
  const SERVER = `/${RouterName.SERVER}`;

  /**
   * 客户端列表请求
   * 向所有服务端发起Status Request的带缓存的函数
   */
  const clientsList: Array<() => Promise<ServerStatus>> = [];
  SERVER_LIST.forEach((server) => {
    const client = new Client(server.host, server.port, server.version);
    clientsList.push(client.getServerListPingWithCache());
  });

  const router = express.Router();
  /* GET users listing. */
  router.get(SERVER, async function (req, res, next) {
    const promises: Promise<ServerStatus>[] = [];
    /* 客户端发起请求 */
    for (let request of clientsList) {
      promises.push(request());
    }
    /* 等待客户端接收并处理消息 */
    const data: ServerStatus[] = [];
    for (let promise of promises) {
      const res = await promise.then((res) => res);
      data.push(res);
    }
    res.send(data);
  });

  return router;
}

export default initRouter;
