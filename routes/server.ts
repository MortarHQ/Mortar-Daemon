import { RouterName } from "@routes";
import { Client, ServerStatus, Version } from "@utils/serverListPingAPI";
import express from "express";
/**
 * 服务器列表信息
 */
const serversList: {
  host: string;
  port: string;
  version: Version;
}[] = [
  {
    host: "fun.mortar.top",
    port: "24445",
    version: "1.16.5",
  },
  {
    host: "fun.mortar.top",
    port: "24446",
    version: "1.19.2",
  },
  {
    host: "fun.mortar.top",
    port: "24447",
    version: "1.18.2",
  },
  {
    host: "fun.mortar.top",
    port: "25565",
    version: "1.12.2",
  },
  {
    host: "bgp.mortar.top",
    port: "25566",
    version: "1.20.4",
  },
];

function initRouter(app: express.Application) {
  const SERVER = `/${RouterName.SERVER}`;

  /**
   * 客户端列表请求
   * 向所有服务端发起Status Request的带缓存的函数
   */
  const clientsList: Array<() => Promise<ServerStatus>> = [];
  serversList.forEach((server) => {
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

  app.use(router);
}

export default initRouter;
