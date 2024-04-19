import {
  type versionMap,
  getServerListPing,
  getServerListPingWithCache,
} from "@utils/serverListPing";
import express from "express";

const serverList: {
  host: string;
  port: string;
  version: keyof typeof versionMap;
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
const getCacheList: (() => Promise<unknown>)[] = [];
serverList.forEach((server) => {
  getCacheList.push(
    getServerListPingWithCache(server.host, server.port, server.version)
  );
});

const router = express.Router();
/* GET users listing. */
router.get("/server", function (req, res, next) {
  const promises = [];
  for (let cache of getCacheList) {
    promises.push(cache());
  }
  Promise.all(promises)
    .then((data) => {
      const dataArray: Object[] = [];
      data.forEach((item) => {
        dataArray.push(item as Object);
      });
      res.send(dataArray);
    })
    .catch((err) => {
      res.send(err);
    });
});

export default router;
