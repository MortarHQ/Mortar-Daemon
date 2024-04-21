import { Server, decodePacketID } from "@utils/serverListPingAPI";
import net from "net";
import config from "config";
import log from "@utils/logger";

// 创建 TCP 服务器
log.info("Starting server...");
const server = net.createServer();

server.on("connection", (socket) => {
  log.info(`New connection from ${socket.remoteAddress}:${socket.remotePort}`);
  socket.on("data", async (data) => {
    if (data[0] === 0xfe) {
      //TODO version <=1.6
      // 暂不响应
      socket.destroy();
      return;
    }

    // 解析接收到的包
    const { length, packetID } = decodePacketID(data);
    switch (true) {
      /* Ping Request */
      case packetID.value === 0x01: {
        /* Pong Response */
        log.info(
          `Pong from ${socket.remoteAddress}:${
            socket.remotePort
          } => ${data.toString("hex")}`
        );
        socket.write(data);
        socket.destroy();
        break;
      }
      /* Handshake | Status Request */
      case packetID.value === 0x00: {
        /* Status Request => void */
        if (data.length === 2) {
          // 无需回复
          return;
        }
        /* Handshake => Status Response */
        const server = new Server(socket, data);
        const packet = await server.createFakeServerPacket().then((res) => res);
        socket.write(packet);
        break;
      }
      default: {
        socket.destroy();
        break;
      }
    }
    return;
  });
});

// 监听 25565 端口
const port = config.get<String>("serverPort");
server.listen(port, () => {
  log.info(`服务器已启动，正在监听 ${port} 端口...`);
});

process.on("uncaughtException", (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
});
