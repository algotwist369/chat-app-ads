const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(__dirname, "..", "uploads");

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const UPLOAD_PUBLIC_PATH = process.env.UPLOAD_PUBLIC_PATH ?? "/uploads";

const determineAttachmentType = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "file";
  if (mimeType.startsWith("text/")) return "file";
  return "file";
};

module.exports = {
  UPLOAD_DIR,
  UPLOAD_PUBLIC_PATH,
  determineAttachmentType,
};
