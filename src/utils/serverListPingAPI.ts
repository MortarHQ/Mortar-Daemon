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
  });
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
      client.write(handshakePacket);

      const statusRequestPacket = createStatusRequestPacket();
      client.write(statusRequestPacket);
    });

    let buffer = Buffer.alloc(0);
    client.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);
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
    new Uint8Array(varInt.buffer, varInt.byteOffset, varInt.byteLength),
    new Uint8Array(
      jsonPacket.buffer,
      jsonPacket.byteOffset,
      jsonPacket.byteLength
    ),
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
    new Uint8Array(packetID.buffer, packetID.byteOffset, packetID.byteLength),
    new Uint8Array(
      protocolVersion.buffer,
      protocolVersion.byteOffset,
      protocolVersion.byteLength
    ),
    new Uint8Array(
      addressBuf.buffer,
      addressBuf.byteOffset,
      addressBuf.byteLength
    ),
    new Uint8Array(portBuf.buffer, portBuf.byteOffset, portBuf.byteLength),
    new Uint8Array(state.buffer, state.byteOffset, state.byteLength),
  ]);

  return createPacket(packet);
}

function createStatusRequestPacket(): Buffer {
  const packetID = Buffer.from([0x00]);
  const packet = Buffer.concat([
    new Uint8Array(packetID.buffer, packetID.byteOffset, packetID.byteLength),
  ]);
  return createPacket(packet);
}

function createPacket(data: Buffer): Buffer {
  const length = Buffer.from(varint.encode(data.length));
  const res = Buffer.concat([
    new Uint8Array(length.buffer, length.byteOffset, length.byteLength),
    new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
  ]);
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
