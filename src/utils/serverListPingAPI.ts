import net, { Socket } from "net";
import { Buffer } from "buffer";
import log from "@utils/logger";
import varint from "varint";
import { encodeProtocol } from "@utils/protocol-utils";
import { config } from "../config/config_parser";
import { ServerStatus, VERSION } from "@declare/delcare_const";

const SERVERLIST = "/serverlist";

class Client {
  private host;
  private port;
  private version;
  constructor(host: string, port: string, version: VERSION) {
    this.host = host;
    this.port = port;
    this.version = version;
  }

  async getServerStatus(): Promise<ServerStatus> {
    return await getServerStatus(this.host, this.port, this.version);
  }
}

class Server {
  private socket;
  private clientData;
  createFakeServerPacket: () => Promise<Buffer>;

  constructor(socket: net.Socket, clientData: Buffer) {
    this.socket = socket;
    this.clientData = clientData;
    this.createFakeServerPacket = createFakeServerPacket.bind(
      this,
      this.socket,
      this.clientData
    );
  }
}

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
    try {
      const { length, packetID } = decodePacketID(clientData);
      const protocolVersion = readVarInt(clientData, packetID.offset);
      const addressLength = readVarInt(clientData, protocolVersion.offset);
      const address = clientData.toString(
        "utf-8",
        addressLength.offset,
        addressLength.value
      );
      const portOffset = addressLength.offset + addressLength.value;
      const port = clientData.readUInt16BE(portOffset);
      const nextState = readVarInt(clientData, portOffset + 2);

      log.info(`收到连接请求，状态值: ${nextState.value}`);

      // 检查状态值，处理玩家加入请求
      // 标准Minecraft协议中，2表示玩家想要登录/加入服务器
      // 从日志中看，值为100时也可能表示加入请求
      if (nextState.value === 0x02) {
        log.info(`接收到玩家尝试加入服务器请求: ${socket.remoteAddress}`);
        const disconnectPacket = createLoginDisconnectPacket(socket);
        resolve(disconnectPacket);
        return;
      }

      const uri = `http://${config.server.host || "localhost"}:${
        config.server.web_port
      }${SERVERLIST}?protocolVersion=${protocolVersion.value}`;
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

      const buffer = createServerStatusPacket(
        Buffer.from(JSON.stringify(serverList))
      );
      resolve(buffer);
    } catch (error) {
      log.error("Error in createFakeServerPacket:", error);
      reject(error);
    }
  });
}

// 创建登录状态下的断开连接数据包
function createLoginDisconnectPacket(socket: net.Socket): Buffer {
  // 在登录状态下的断开连接包ID是0x00
  const packetID = Buffer.from([0x00]);

  // 使用更简单的方法处理Unicode转义
  function escapeUnicode(jsonStr: string) {
    return jsonStr.replace(/[\u0080-\uFFFF]/g, function (match) {
      return "\\u" + ("0000" + match.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  // 创建具有丰富格式的消息对象
  const messageObj = {
    text: "非游戏服务器\n",
    extra: [
      {
        text: "请选择其他服务器\n",
        bold: true,
        color: "red",
      },
      {
        text: `请求时间: ${new Date().toLocaleString()}\n`,
        color: "gray",
        italic: true,
      },
      {
        text: `请求IP: ${socket.remoteAddress}`,
        color: "gray",
        italic: true,
      },
    ],
  };

  // 先使用JSON.stringify，然后转换Unicode
  const jsonString = escapeUnicode(JSON.stringify(messageObj));

  // 编码字符串长度
  const messageLength = Buffer.from(varint.encode(jsonString.length));
  const messageBuffer = Buffer.from(jsonString, "utf8");

  const packet = Buffer.concat([
    new Uint8Array(packetID),
    new Uint8Array(messageLength),
    new Uint8Array(messageBuffer),
  ]);

  return createPacket(packet);
}

function getServerStatus(
  serverAddress: string,
  serverPort: string,
  version: VERSION = "1.16.5"
) {
  return new Promise<ServerStatus>((resolve, reject) => {
    log.info(`正在获取 ${serverAddress}:${serverPort} ${version} 服务器状态`);
    const client = new net.Socket();

    client.connect(parseInt(serverPort, 10), serverAddress, () => {
      const handshakePacket = createHandshakePacket(
        serverAddress,
        parseInt(serverPort, 10),
        version
      );
      client.write(new Uint8Array(handshakePacket));

      const statusRequestPacket = createStatusRequestPacket();
      client.write(new Uint8Array(statusRequestPacket));
    });

    let buffer = Buffer.alloc(0);
    client.on("data", (data) => {
      buffer = Buffer.concat([new Uint8Array(buffer), new Uint8Array(data)]);
      let varint = readVarInt(buffer, 0);
      if (buffer.length < varint.value) {
        return;
      } else {
        const res = parseServerStatusPacket(serverAddress, serverPort, buffer);
        resolve(res);
        client.destroy();
        log.info(
          `获取 ${serverAddress}:${serverPort} ${version} 服务器状态成功！`
        );
      }
    });

    client.on("error", (error) => {
      log.error("Error", error);
      reject(error);
    });

    client.on("close", () => {
      client.destroy();
      const msg = `${serverAddress}:${serverPort} ${version} 服务器关闭 跳过检测！`;
      reject(msg);
    });

    client.setTimeout(1000, () => {
      client.destroy();
      const msg = `${serverAddress}:${serverPort} ${version} 连接超时，跳过查询！`;
      reject(msg);
    });
  });
}

function createServerStatusPacket(jsonBuffer: Buffer) {
  const jsonPacket = createPacket(jsonBuffer);
  const varInt = Buffer.from(varint.encode(0));

  const buffer = Buffer.concat([
    new Uint8Array(varInt),
    new Uint8Array(jsonPacket),
  ]);

  return createPacket(buffer);
}

function parseServerStatusPacket(
  serverAddress: String,
  serverPort: String,
  packet: Buffer
) {
  const varInt1 = readVarInt(packet, 0);
  const varInt2 = readVarInt(packet, varInt1.offset);
  const varInt3 = readVarInt(packet, varInt2.offset);
  log.debug(
    JSON.stringify({
      title: { value: `${serverAddress}:${serverPort}` },
      varInt1,
      varInt2,
      varInt3,
    })
  );

  const jsonBuffer = packet.slice(
    varInt3.offset,
    varInt3.offset + varInt3.value
  );
  const jsonData = jsonBuffer.toString("utf-8");
  try {
    const jsonResponse = JSON.parse(jsonData);
    return jsonResponse;
  } catch (error) {
    return error;
  }
}

function createHandshakePacket(
  address: string,
  port: number,
  version: VERSION
): Buffer {
  const packetID = Buffer.from([0x00]);
  const protocolVersion = encodeProtocol(version, log);
  const addressBuf = createPacket(Buffer.from(address));
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port);
  const state = Buffer.from([0x01]);

  const packet = Buffer.concat([
    new Uint8Array(packetID),
    new Uint8Array(protocolVersion),
    new Uint8Array(addressBuf),
    new Uint8Array(portBuf),
    new Uint8Array(state),
  ]);

  return createPacket(packet);
}

function createStatusRequestPacket(): Buffer {
  const packetID = Buffer.from([0x00]);
  const packet = Buffer.concat([new Uint8Array(packetID)]);
  return createPacket(packet);
}

function createPacket(data: Buffer): Buffer {
  const length = Buffer.from(varint.encode(data.length));
  const res = Buffer.concat([new Uint8Array(length), new Uint8Array(data)]);
  return res;
}

function readVarInt(buffer: Buffer, offset: number) {
  if (offset >= buffer.length) {
    log.error(`offset:${offset} buffer:${buffer.toString("hex")}`);
    throw new Error("Invalid varint");
  }
  const result = varint.decode(new Uint8Array(buffer), offset);
  // @ts-ignore
  const newOffset = offset + varint.decode.bytes;

  return {
    value: result,
    offset: newOffset,
  };
}

export { decodePacketID };
export { Client, Server };
