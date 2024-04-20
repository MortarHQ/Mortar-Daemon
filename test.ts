import { getServerListPing } from "@utils/serverListPing";
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
  rl.question("：", (input) => {
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
        promptForServerAddress();
        return;
      default:
    }

    let [host, port] = input.split(":");
    if (!host.trim().length) {
      console.log("请输入正确的服务器地址");
      // 异步递归
      promptForServerAddress();
      return;
    }
    if (!port) port = "25565";

    getServerListPing(host, port)
      .then((data) => {
        const filename = "test.json";
        console.log(`已生成至 ${import.meta.dirname}/${filename}`);
        writeFileSync(filename, JSON.stringify(data, null, 2));
      })
      .catch((error) => {
        console.error("获取服务器信息时发生错误：", error);
      })
      .finally(() => {
        // 异步递归
        promptForServerAddress();
      });
  });
}
