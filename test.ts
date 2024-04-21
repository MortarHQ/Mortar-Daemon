import { Client } from "@utils/serverListPingAPI";
import { writeFileSync } from "fs";
import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

console.clear();
console.log(`请输入服务器地址
如：bgp.mortar.top:25565
输入 'exit | quit | end | stop' 退出程序`);

// 首次调用函数以开始循环
promptForServerAddress();

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception: ", error);
  process.exit(1);
});

function promptForServerAddress() {
  rl.question("：", async (input) => {
    switch (input.trim().toLowerCase()) {
      case "exit":
      case "quit":
      case "end":
      case "stop":
        // 检查是否输入了退出命令
        console.log(`now exiting...`);
        rl.close(); // 关闭readline接口
        return;
      case "clear":
        console.clear();
        next();
        return;
      default:
    }

    let [host, port] = input.split(":");
    if (!host.trim().length) {
      console.log("请输入正确的服务器地址");
      // 异步递归
      next();
      return;
    }
    if (!port) port = "25565";

    const client = new Client(host, port, "1.16.5");
    const request = client.getServerListPingWithCache();
    const res = await request().then((res) => res);
    writeFileSync("test.json", JSON.stringify(res, null, 2));
    console.log("已写入到 ./test.json 中");
    next();
  });
}

function next() {
  setTimeout(() => {
    promptForServerAddress();
  }, 300);
}
