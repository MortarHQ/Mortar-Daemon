import express from "express";

// 路由配置接口
interface RouterConf {
  name: string;
  path: string;
  router: Promise<unknown>;
  meta?: unknown;
}

enum RouterName {
  SERVER = "server",
  SERVER_LIST = "serverlist",
  OFFSET = "offset",
}

// 路由配置
const routerConfigure: Array<RouterConf> = [
  {
    name: RouterName.SERVER,
    path: `/${RouterName.SERVER}`,
    router: import("./server"),
  },
  {
    name: RouterName.SERVER_LIST,
    path: `/${RouterName.SERVER_LIST}`,
    router: import("./serverList"),
  },
  {
    name: RouterName.OFFSET,
    path: `/${RouterName.OFFSET}`,
    router: import("./offset"),
  },
];

async function initRouter(app: express.Application) {
  const router = express.Router();
  routerConfigure.forEach(async (item) => {
    const module = (await item.router.then((module) => module)) as {
      default: (app: express.Application) => void;
    };
    module.default(app);
  });
  app.use(router);
}

export default initRouter;
export { routerConfigure, RouterName };
