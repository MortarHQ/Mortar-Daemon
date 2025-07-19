import express from "express";
import serverRouter from "./server";
import serverListRouter from "./serverList";
import offsetRouter from "./offset";
import healthRouter from "./health";

function initRouter() {
  const router = express.Router();
  
  router.use("/server", serverRouter());
  router.use("/serverlist", serverListRouter());
  router.use("/offset", offsetRouter());
  router.use("/health", healthRouter());
  
  return router;
}

export default initRouter;


