import { Version } from "@utils/serverListPingAPI";

/**
 * 服务器列表信息
 */
const SERVER_LIST: {
  host: string;
  port: string;
  version: Version;
}[] = [
  {
    host: "fun.mortar.top",
    port: "24445",
    version: "1.16.5",
  },
  {
    host: "fun.mortar.top",
    port: "24446",
    version: "1.19.2",
  },
  {
    host: "fun.mortar.top",
    port: "24447",
    version: "1.18.2",
  },
  {
    host: "fun.mortar.top",
    port: "25565",
    version: "1.12.2",
  },
  {
    host: "bgp.mortar.top",
    port: "25566",
    version: "1.20.4",
  },
];

export { SERVER_LIST };
