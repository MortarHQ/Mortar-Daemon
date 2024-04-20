import express from "express";
import serverRouter from "./server";
import lspOffsetRouter, { LSPOFFSET } from "./lspOffset";

const router = express.Router();

router.use(lspOffsetRouter);
router.use(serverRouter);

export default router;
