import "server-only";
import fs from "fs";
import path from "path";
import sharp from "sharp";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "covers");

/** Re-encodes an uploaded cover to webp and saves it under
 * public/uploads/covers. Sharp both validates the file is a real decodable
 * image (throws on anything else, regardless of the claimed MIME type) and
 * strips embedded metadata/exif on re-encode. Cropped to 3:4 to match the
 * arch-card aspect ratio used by PostCard. */
export async function saveCoverImage(file: File, slugHint: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${slugHint}-${Date.now()}.webp`;

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  await sharp(buffer)
    .resize({ width: 1200, height: 1600, fit: "cover" })
    .webp({ quality: 82 })
    .toFile(path.join(UPLOAD_DIR, filename));

  return `/uploads/covers/${filename}`;
}
