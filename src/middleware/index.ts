import express, { Express } from "express";
import responseHeader from "./responseHeader";

function initMiddleWare(app: Express) {
  app.use(express.json());
  app.use(responseHeader);
}

export default initMiddleWare;
