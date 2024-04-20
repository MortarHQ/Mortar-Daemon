import express from "express";
import serverRoute from "./server";

const router = express.Router();

router.get("/", (req, res) => {
  res.render("index", {
    title: "Mortar EJS",
    serverData: "hello world",
  });
});
router.use(serverRoute);

export default router;
