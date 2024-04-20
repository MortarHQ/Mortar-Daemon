import {
  createFakeServerPacket,
  createServerListPingPacket,
  decodePacketID,
  getBase64Image,
  parseServerListPingPacket,
  readVarInt,
} from "@utils/serverListPing";
import net from "net";
import config from "config";
import log from "@utils/logger";

// 创建 TCP 服务器
const server = net.createServer();

server.on("connection", (socket) => {
  socket.on("data", async (data) => {
    if (data[0] === 0xfe) {
      //TODO version <=1.6
      return;
    } else if (data.length === 2) {
      // 不响应pong
      return;
    }
    // 解析包
    const { length, packetID } = decodePacketID(data);
    switch (true) {
      case packetID.value === 0x01: {
        log.info(
          `Pong from ${socket.remoteAddress}:${
            socket.remotePort
          } => ${data.toString("hex")}`
        );
        socket.write(data);
        break;
      }
      case packetID.value === 0x00: {
        const packet = await createFakeServerPacket(data).then((res) => res);
        socket.write(packet);
        break;
      }
      default: {
        socket.end();
        break;
      }
    }
  });
});

// 监听 25565 端口
const port = config.get<String>("serverPort");
server.listen(port, () => {
  console.log(`服务器已启动，正在监听 ${port} 端口...`);
});

process.on("uncaughtException", (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
});
