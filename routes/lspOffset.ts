import express from "express";

const router = express.Router();
const lspOffset = "lspOffset";
router.post(lspOffset, (req, res, next) => {
  console.log(req.body);
});

export default router;
export { lspOffset as LSPOFFSET };
