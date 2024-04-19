import {
  createServerListPingPacket,
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
    // 解析客户端传来的消息
    const length = readVarInt(data, 0);
    const packetID = readVarInt(data, length.offset);
    const protocolVersion = readVarInt(data, packetID.offset);
    // 响应ping
    if (packetID.value === 0x01) {
      log.info(
        `Pong from ${socket.remoteAddress}:${
          socket.remotePort
        } => ${data.toString("hex")}`
      );
      socket.write(data);
      socket.end();
      return;
    }
    // 阻止其他连接
    if (packetID.value !== 0x00) {
      socket.end();
    }
    const addressLength = data.lastIndexOf(99);
    const address = data.toString(
      "utf-8",
      protocolVersion.offset + 1,
      addressLength
    );
    const port = data.readUInt16BE(addressLength);
    const state = data[addressLength + 2];

    const uri = `http://${config.get("host")}:${config.get("port")}/server`;
    const serverList = await fetch(uri)
      .then((response) => response.json())
      .then((data) => data)
      .catch((error) => console.error(error));
    const sample: { name: String; id: String }[] = [];
    for (let server of serverList) {
      if (server && server.players && server.players.sample) {
        server.players.sample.forEach((player: (typeof sample)[0]) => {
          player.name = `${player.name} -- ${server.version.name}`;
          sample.push(player);
        });
      }
    }
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
    // 再进行解析查看是否有问题
    const res2 = parseServerListPingPacket("127.0.0.1", "25565", buffer);
    socket.write(buffer);
  });
});

// 监听 25565 端口
const port = config.get<String>("serverPort");
server.listen(port, () => {
  console.log(`服务器已启动，正在监听 ${port} 端口...`);
});
