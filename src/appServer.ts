import { MinecraftProtocolHandler } from "@utils/serverListPingAPI";
import net from "net";
import log from "@utils/logger";
import { config } from "./config/config_parser";

// 创建 TCP 服务器
log.info("Starting server...");
const server = net.createServer();

server.on("connection", (socket) => {
  log.info(`New connection from ${socket.remoteAddress}:${socket.remotePort}`);

  // 为每个连接创建一个协议处理器
  const protocolHandler = new MinecraftProtocolHandler(socket);

  // 处理数据
  socket.on("data", async (data) => {
    try {
      await protocolHandler.handlePacket(data);
    } catch (err) {
      log.error("处理数据包时出错:", err);
      socket.destroy();
    }
  });

  // 添加错误处理
  socket.on("error", (err) => {
    log.error(`Socket错误: ${err.message}`);
    socket.destroy();
  });

  // 添加连接关闭处理
  socket.on("close", () => {
    log.debug(`连接已关闭: ${socket.remoteAddress}:${socket.remotePort}`);
  });
});

// 监听端口
const port = config.server.port;
server.listen(port, () => {
  log.info(`服务器已启动，正在监听 ${port} 端口...`);
});

process.on("uncaughtException", (err) => {
  log.error(`Uncaught Exception: ${err.message}`);
  console.trace(err);
});
