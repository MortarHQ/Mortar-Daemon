import { ServerStatus } from "@declare/delcare_const";

import express from "express";
import log from "@utils/logger";
import { getBase64Image, version2Protocol } from "@utils/serverListPingAPI";
import { config } from "../config/config_parser";

function initRouter() {
  const host = config.server.host || "localhost";
  const port = config.server.web_port;
  const addr = `http://${host}:${port}`;

  const router = express.Router();
  router.get("/", async (req, res, next) => {
    // 检查query是否拥有protocolVersion
    let protocolVersion = parseInt(req.query.protocolVersion as string);
    if (!protocolVersion) protocolVersion = version2Protocol("1.16.5");

    // 获取server
    const allServer: ServerStatus[] = await fetch(`${addr}/server`, {
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
    const serverListOffset = await fetch(`${addr}/offset/`, {
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

  return router;
}

export default initRouter;
