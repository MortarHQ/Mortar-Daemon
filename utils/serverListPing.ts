import net, { Socket } from "net";
import { Buffer } from "buffer";
import log from "@utils/logger";
import varint from "varint";
import config from "config";

const versionMap = {
  "1.20.4": 765,
  "1.19.2": 760,
  "1.18.2": 758,
  "1.16.5": 762,
  "1.12.2": 340,
};

type ServerListPingFeed = {
  description: Object;
  players: {
    max: Number;
    online: Number;
    sample?: { name: String; id: String }[];
  };
  version: {
    name: keyof typeof versionMap | String;
    protocol: (typeof versionMap)[keyof typeof versionMap] | Number;
  };
  favicon: String;
  forgeData: {
    chanels: {
      res: String;
      version: String;
      required: Boolean;
    }[];
  };
};

function decodePacketID(data: Buffer) {
  const length = readVarInt(data, 0);
  const packetID = readVarInt(data, length.offset);
  return { length, packetID };
}

function createFakeServerPacket(
  socket: Socket,
  clientData: Buffer
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    // 解析客户端传来的消息
    const { length, packetID } = decodePacketID(clientData);
    const protocolVersion = readVarInt(clientData, packetID.offset);
    const addressLength = clientData.lastIndexOf(99);
    const address = clientData.toString(
      "utf-8",
      protocolVersion.offset + 1,
      addressLength
    );
    const port = clientData.readUInt16BE(addressLength);
    const state = clientData[addressLength + 2];

    // 读取Mortar Server列表
    const uri = `http://${config.get("host")}:${config.get("port")}/server`;
    const requestInit = {
      headers: {
        "X-Forwarded-For": socket.remoteAddress,
      },
    } as RequestInit;
    const serverList = await fetch(uri, requestInit)
      .then((response) => response.json())
      .then((data) => data)
      .catch((error) => {
        log.error(import.meta.filename);
        log.error(error);
        return [];
      });
    // 解析玩家
    const sample: { name: String; id: String }[] = [];
    for (let server of serverList) {
      if (server && server.players && server.players.sample) {
        server.players.sample.forEach((player: (typeof sample)[0]) => {
          player.name = `${player.name} -- ${server.version.name}`;
          sample.push(player);
        });
      }
    }
    // 构造服务列表信息
    const res = JSON.parse(`{
      "version": {
          "name": "mortar",
          "protocol": ${protocolVersion.value}
      },
      "favicon": "${getBase64Image()}",
      "enforcesSecureChat": true,
      "description": [
          {
              "text":"Mortar",
              "bold":true,
              "color":"aqua"
          },{
              "text":" 全服在线人数统计",
              "bold":true,
              "color":"gold"
          },{
              "text":"这是你永远也不能到达的境地……",
              "italic":true,
              "underlined":true,
              "color":"gray"
          }
      ],
      "players": {
          "max": ${sample.length + 1},
          "online": ${sample.length},
          "sample": ${JSON.stringify(sample)}
      }
  }`);

    const buffer = createServerListPingPacket(Buffer.from(JSON.stringify(res)));
    resolve(buffer);
    return;
  });
}

function getServerListPingWithCache(
  host: string,
  port: string,
  version: keyof typeof versionMap
) {
  let lastBuffData = {
    data: {} as ServerListPingFeed,
    time: 0,
  };
  return () => {
    return new Promise((resolve, reject) => {
      // 缓存未过期
      if (lastBuffData.time + 60 * 1000 > Date.now()) {
        log.info(`${host}:${port} 缓存未过期`);
        resolve(lastBuffData.data);
        return;
      }
      // 缓存过期
      log.warn(`${host}:${port} 缓存过期`);
      getServerListPing(host, port, version)
        .then((data) => {
          lastBuffData.data = data as ServerListPingFeed;
          lastBuffData.time = Date.now();
          resolve(lastBuffData.data);
        })
        .catch((err) => {
          reject(err);
        });
    });
  };
}

function getServerListPing(
  serverAddress: string,
  serverPort: string,
  version: keyof typeof versionMap = "1.16.5"
) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(parseInt(serverPort, 10), serverAddress, () => {
      // 发送握手包
      const handshakePacket = createHandshakePacket(
        serverAddress,
        parseInt(serverPort, 10),
        version
      );
      client.write(handshakePacket);

      // 紧接着发送状态请求包
      const statusRequestPacket = createStatusRequestPacket();
      client.write(statusRequestPacket);
    });

    let buffer = Buffer.alloc(0); // 创建一个空的缓冲区
    client.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]); // 将新数据追加到缓冲区
      let varint = readVarInt(buffer, 0);
      if (buffer.length < varint.value) {
        return;
      } else {
        const res = parseServerListPingPacket(
          serverAddress,
          serverPort,
          buffer
        );
        resolve(res);
        return;
      }
    });

    client.on("error", (error) => {
      log.error("Error", error);
      reject(error);
    });
  });
}

function createServerListPingPacket(jsonBuffer: Buffer) {
  const jsonPacket = createPacket(jsonBuffer);
  const varInt = Buffer.from(varint.encode(0));
  const buffer = Buffer.concat([varInt, jsonPacket]);
  return createPacket(buffer);
}

function parseServerListPingPacket(
  serverAddress: String,
  serverPort: String,
  packet: Buffer
) {
  const varInt1 = readVarInt(packet, 0); // 尝试读取VarInt
  const varInt2 = readVarInt(packet, varInt1.offset); // 尝试读取VarInt
  const varInt3 = readVarInt(packet, varInt2.offset); // 尝试读取VarInt
  console.debug({
    title: { value: `${serverAddress}:${serverPort}` },
    varInt1,
    varInt2,
    varInt3,
  });

  // 提取JSON数据
  const jsonBuffer = packet.slice(
    varInt3.offset,
    varInt3.offset + varInt3.value
  );
  const jsonData = jsonBuffer.toString("utf-8");
  // 解析JSON
  try {
    const jsonResponse = JSON.parse(jsonData);
    // 发送数据
    return jsonResponse;
  } catch (error) {
    // 发送错误
    return error;
  }
}

function createHandshakePacket(
  address: string,
  port: number,
  version: keyof typeof versionMap
): Buffer {
  const packetID = Buffer.from([0x00]); // 握手的packet ID
  const protocolVersion = encodeProtocolVersion(version); // 协议版本
  const addressBuf = Buffer.from(address);
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port);
  const state = Buffer.from([0x01]); // 状态请求 0x02为登录

  const addressLength = Buffer.from([addressBuf.length]);
  const packet = Buffer.concat([
    packetID,
    protocolVersion,
    addressLength,
    addressBuf,
    portBuf,
    state,
  ]);
  return createPacket(packet);
}

function createStatusRequestPacket(): Buffer {
  const packetID = Buffer.from([0x00]); // 状态请求的packet ID
  return createPacket(packetID);
}

function createPacket(data: Buffer): Buffer {
  const length = Buffer.from(varint.encode(data.length));
  const res = Buffer.concat([length, data]);
  return res;
}

/**
 * 将版本转换到VarInt字节码
 * @param versionString
 * @returns
 */
function encodeProtocolVersion(versionString: keyof typeof versionMap): Buffer {
  let version = versionMap[versionString];
  if (version === undefined) {
    throw new Error("Unsupported version string");
  }

  return Buffer.from(varint.encode(version));
}

function readVarInt(buffer: Buffer, offset: number) {
  if (offset >= buffer.length) {
    log.error(`offset:${offset} buffer:${buffer.toString("hex")}`);
    throw new Error("Invalid varint");
  }
  const result = varint.decode(buffer, offset);
  // @ts-ignore
  const newOffset = offset + varint.decode.bytes;

  return {
    value: result,
    offset: newOffset,
  };
}

function getBase64Image() {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAACXBIWXMAAA7EAAAOxAGVKw4bAAADfGlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iWE1QIENvcmUgNi4wLjAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iCiAgICAgICAgICAgIHhtbG5zOnRpZmY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vdGlmZi8xLjAvIgogICAgICAgICAgICB4bWxuczpJcHRjNHhtcEV4dD0iaHR0cDovL2lwdGMub3JnL3N0ZC9JcHRjNHhtcEV4dC8yMDA4LTAyLTI5LyI+CiAgICAgICAgIDxkYzp0aXRsZT4KICAgICAgICAgICAgPHJkZjpBbHQ+CiAgICAgICAgICAgICAgIDxyZGY6bGkgeG1sOmxhbmc9IngtZGVmYXVsdCI+5pyq5ZG95ZCN5L2c5ZOBPC9yZGY6bGk+CiAgICAgICAgICAgIDwvcmRmOkFsdD4KICAgICAgICAgPC9kYzp0aXRsZT4KICAgICAgICAgPHRpZmY6WVJlc29sdXRpb24+MTMyPC90aWZmOllSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpYUmVzb2x1dGlvbj4xMzI8L3RpZmY6WFJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlBob3RvbWV0cmljSW50ZXJwcmV0YXRpb24+MjwvdGlmZjpQaG90b21ldHJpY0ludGVycHJldGF0aW9uPgogICAgICAgICA8dGlmZjpSZXNvbHV0aW9uVW5pdD4yPC90aWZmOlJlc29sdXRpb25Vbml0PgogICAgICAgICA8SXB0YzR4bXBFeHQ6QXJ0d29ya1RpdGxlPuacquWRveWQjeS9nOWTgTwvSXB0YzR4bXBFeHQ6QXJ0d29ya1RpdGxl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";
}

export {
  decodePacketID,
  parseServerListPingPacket,
  getServerListPingWithCache,
  getServerListPing,
  getBase64Image,
  createFakeServerPacket,
  createServerListPingPacket,
  createHandshakePacket,
  createStatusRequestPacket,
  createPacket,
  encodeProtocolVersion,
  readVarInt,
};

export type { versionMap, ServerListPingFeed };
