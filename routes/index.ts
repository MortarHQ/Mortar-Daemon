import express from "express";
import serverRouter from "./server";
import lspOffsetRouter from "./lspOffset";
import serverListRouter from "./serverList";

const router = express.Router();

router.use(lspOffsetRouter);
router.use(serverRouter);
router.use(serverListRouter);

export default router;
