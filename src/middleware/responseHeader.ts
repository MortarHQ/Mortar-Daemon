import { Request, Response, NextFunction, RequestHandler } from "express";

const responseHeader: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { origin, Origin, referer, Referer } = req.headers;

  let allowOrigin: string | string[] | undefined;
  // 如果是开发模式，则默认允许全部跨域，否则只能允许origin
  if (process.env.NODE_ENV === "development") {
    allowOrigin = "*";
  } else {
    allowOrigin = origin || Origin || referer || Referer;
  }
  // 允许请求源
  res.header("Access-Control-Allow-Origin", allowOrigin);
  // 允许头部字段
  res.header("Access-Control-Allow-Headers", "Content-Type");
  // 允许公开的头部字段
  res.header("Access-Control-Expose-Headers", "Content-Disposition");
  // 允许的请求方式
  res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
  // 允许携带cookie
  res.header("Access-Control-Allow-Credentials", "true");

  // 预检返回204
  if (req.method == "OPTIONS") {
    res.sendStatus(204);
  } else {
    next();
  }
};

export default responseHeader;
