import express from "express";
import config from "config";
import log from "@utils/logger";
import {
  ServerStatus,
  getBase64Image,
  version2Protocol,
} from "@utils/serverListPingAPI";
import { RouterName } from "@routes";

function initRouter(app: express.Application) {
  const SERVERLIST = `/${RouterName.SERVER_LIST}`;
  const SERVER = `/${RouterName.SERVER}`;
  const OFFSET = `/${RouterName.OFFSET}`;

  const host = config.get<String>("host");
  const port = config.get<String>("port");
  const addr = `http://${host}:${port}`;

  const router = express.Router();
  router.get(SERVERLIST, async (req, res, next) => {
    // 检查query是否拥有protocolVersion
    let protocolVersion = parseInt(req.query.protocolVersion as string);
    if (!protocolVersion) protocolVersion = version2Protocol("1.16.5");

    // 获取server
    const allServer: ServerStatus[] = await fetch(`${addr}${SERVER}`, {
      headers: req.headers as HeadersInit,
    })
      .then((res) => res.json())
      .then((res) => res)
      .catch((err) => {
        log.error(import.meta.filename);
        log.error(err);
        return [];
      });

    // 解析玩家
    const sample: { name: String; id: String }[] = [];
    for (let server of allServer) {
      if (
        server &&
        server.players &&
        server.players.sample &&
        server.version &&
        server.version.name
      ) {
        server.players.sample.forEach((player: (typeof sample)[0]) => {
          player.name = `${player.name} -- ${server.version.name}`;
          sample.push(player);
        });
      }
    }

    /* 构造服务列表信息 */
    const originInfo = JSON.parse(`{
    "version": {
        "name": "mortar",
        "protocol": ${protocolVersion}
    },
    "favicon": "${getBase64Image()}",
    "enforcesSecureChat": true,
    "description": [],
    "players": {
        "max": ${sample.length},
        "online": ${sample.length},
        "sample": ${JSON.stringify(sample)}
    }
  }`) as ServerStatus;
    originInfo.description = [
      "",
      { text: "Mortar", bold: true, color: "aqua" },
      { text: " 全服在线人数统计", bold: true, color: "gold" },
      {
        text: "\n这是你永远也不能到达的境地……",
        italic: true,
        underlined: true,
        color: "gray",
      },
    ];
    // 自定义偏移
    const serverListOffset = await fetch(`${addr}${OFFSET}/`, {
      headers: req.headers as RequestInit["headers"],
    })
      .then((data) => data.json())
      .then((res) => res)
      .catch((error) => {
        log.error(import.meta.filename);
        log.error(error);
        return {};
      });
    // 合并结果
    const resInfo = {};
    Object.assign(resInfo, originInfo, serverListOffset);
    res.send(resInfo);
  });

  app.use(router);
}

export default initRouter;
