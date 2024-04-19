import express from "express";
import serverRoute from "./server";

const router = express.Router();

/* GET home page. */
router.get("/", function (req, res, next) {
  res.send("Hello World!");
});

router.use(serverRoute);

export default router;
