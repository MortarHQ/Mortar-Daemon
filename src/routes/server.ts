import { Client, ServerStatus, Version } from "@utils/serverListPingAPI";
import express from "express";
import { config } from "../config_loader";

function initRouter() {
  const SERVER_LIST = config.server_list;

  /**
   * 客户端列表请求
   * 向所有服务端发起Status Request的带缓存的函数
   */
  const clientsList: Array<Client> = [];
  SERVER_LIST.forEach((server) => {
    const client = new Client(
      server.host,
      server.port,
      server.version as Version
    );
    clientsList.push(client);
  });

  const router = express.Router();
  /* GET users listing. */
  router.get("/", async function (req, res, next) {
    try {
      /* 客户端发起请求 */
      const promises = clientsList.map((client) =>
        client.getServerStatus().catch((err) => {
          console.error(`服务器状态查询错误: ${err}`);
          return null; // 返回 null 表示此服务器查询失败
        })
      );

      /* 使用 Promise.allSettled 更健壮地处理所有请求 */
      const results = await Promise.all(promises);

      /* 过滤掉 null 值，只保留成功获取的状态 */
      const data = results.filter(
        (result) => result !== null
      ) as ServerStatus[];

      res.send(data);
    } catch (error) {
      console.error("处理服务器状态请求时出错:", error);
      res.status(500).send({ error: "获取服务器状态时出错" });
    }
  });

  return router;
}

export default initRouter;
