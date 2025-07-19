import net, { Socket } from "net";
import { Buffer } from "buffer";
import log from "@utils/logger";
import varint from "varint";
import { getServerIcon } from "@utils/image-utils";
import { config } from "../config_loader";
import { ServerStatus, VERSION, VERSION_TO_PROTOCOL_MAP } from "@declare/delcare_const";

const SERVERLIST = "/serverlist";

class Client {
  private host;
  private port;
  private version;
  constructor(
    host: string,
    port: string,
    version: keyof typeof VERSION_TO_PROTOCOL_MAP
  ) {
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
    // 解析客户端传来的消息
    const { length, packetID } = decodePacketID(clientData);
    const protocolVersion = readVarInt(clientData, packetID.offset);
    const addressLength = readVarInt(clientData, protocolVersion.offset);
    const address = clientData.toString(
      "utf-8",
      protocolVersion.offset + 1,
      addressLength.value
    );
    const port = clientData.readUInt16BE(addressLength.offset);
    const state = clientData[addressLength.value + 2];

    // 读取Mortar Server List列表
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
    return;
  });
}

function getServerStatus(
  serverAddress: string,
  serverPort: string,
  version: VERSION = "1.16.5"
) {
  return new Promise((resolve, reject) => {
    log.info(`正在获取 ${serverAddress}:${serverPort} ${version} 服务器状态`);
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
        const res = parseServerStatusPacket(serverAddress, serverPort, buffer);
        resolve(res);
        client.destroy();
        return;
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

    client.setTimeout(3000, () => {
      client.destroy();
      const msg = `${serverAddress}:${serverPort} ${version} 连接超时，跳过查询！`;
      reject(msg);
    });
  });
}

function createServerStatusPacket(jsonBuffer: Buffer) {
  const jsonPacket = createPacket(jsonBuffer);
  const varInt = Buffer.from(varint.encode(0));
  const buffer = Buffer.concat([varInt, jsonPacket]);
  return createPacket(buffer);
}

function parseServerStatusPacket(
  serverAddress: String,
  serverPort: String,
  packet: Buffer
) {
  const varInt1 = readVarInt(packet, 0); // 尝试读取VarInt
  const varInt2 = readVarInt(packet, varInt1.offset); // 尝试读取VarInt
  const varInt3 = readVarInt(packet, varInt2.offset); // 尝试读取VarInt
  log.debug(
    JSON.stringify({
      title: { value: `${serverAddress}:${serverPort}` },
      varInt1,
      varInt2,
      varInt3,
    })
  );

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
  version: keyof typeof VERSION_TO_PROTOCOL_MAP
): Buffer {
  const packetID = Buffer.from([0x00]); // 握手的packet ID
  const protocolVersion = encodeProtocol(version); // 协议版本
  const addressBuf = createPacket(Buffer.from(address)); // 服务器地址
  const portBuf = Buffer.alloc(2);
  portBuf.writeUInt16BE(port);
  const state = Buffer.from([0x01]); // 状态请求 0x02为登录

  const packet = Buffer.concat([
    packetID,
    protocolVersion,
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

function version2Protocol(versionString: keyof typeof VERSION_TO_PROTOCOL_MAP) {
  if (versionString in VERSION_TO_PROTOCOL_MAP) {
    return VERSION_TO_PROTOCOL_MAP[versionString];
  } else {
    log.warn(`不支持${versionString}，已自动替换成1.16.5`);
    return VERSION_TO_PROTOCOL_MAP["1.16.5"];
  }
}

/**
 * 将协议号转换到VarInt字节码
 * @param versionString
 * @returns
 */
function encodeProtocol(
  versionString: keyof typeof VERSION_TO_PROTOCOL_MAP
): Buffer {
  let version = version2Protocol(versionString);
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
  return getServerIcon();
}

export { getBase64Image, decodePacketID, version2Protocol };
export { Client, Server };
