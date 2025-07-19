import fs from "fs";
import path from "path";

// 缓存服务器图标的 base64 字符串
let cachedServerIcon: string | null = null;

/**
 * 检查图片文件是否存在
 * @param imagePath 图片路径
 * @returns 是否存在
 */
function imageExists(imagePath: string): boolean {
  try {
    fs.accessSync(imagePath, fs.constants.F_OK);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 获取图片的 Base64 编码
 * @param imagePath 图片路径
 * @returns Base64 编码的图片
 */
function getBase64Image(imagePath: string): string {
  try {
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
  } catch (error) {
    return "";
  }
}

/**
 * 获取服务器图标的 Base64 编码，带缓存
 * @returns Base64 编码的服务器图标
 */
function getServerIcon(): string {
  if (cachedServerIcon !== null) {
    return cachedServerIcon;
  }

  const imagePath = path.join(process.cwd(), "data", "server-icon.png");
  if (imageExists(imagePath)) {
    cachedServerIcon = getBase64Image(imagePath);
    return cachedServerIcon;
  }

  return "";
}

export { getServerIcon };
