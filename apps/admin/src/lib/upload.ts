import "server-only";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

const PUBLIC_DIR = path.join(process.cwd(), "public", "uploads");

/** Longest edge kept for an in-article image. The blog renders the column at
 * ~760 CSS px, so this covers a 2× screen with room to spare; anything
 * larger is weight the reader pays for and never sees. */
const CONTENT_MAX_EDGE = 2000;

export type UploadKind = "covers" | "content";

// The client-facing constants live in lib/upload-constants.ts so the admin's
// file-picker components can import them without dragging sharp into the
// browser bundle.
export { MAX_UPLOAD_BYTES, ACCEPTED_FORMATS, ACCEPT_ATTRIBUTE } from "@/lib/upload-constants";
import { MAX_UPLOAD_BYTES, ACCEPTED_FORMATS } from "@/lib/upload-constants";

export type UploadFailure =
  /** Not an image at all, or an image sharp can't decode. */
  | { reason: "decode"; message: string }
  /** Decoded fine, but we couldn't write it to disk. Almost always a
   * deployment problem rather than anything the editor did. */
  | { reason: "write"; message: string; detail: string }
  | { reason: "too-large"; message: string }
  | { reason: "empty"; message: string };

export class UploadError extends Error {
  readonly failure: UploadFailure;
  constructor(failure: UploadFailure) {
    super(failure.message);
    this.name = "UploadError";
    this.failure = failure;
  }
}

function safeStem(hint: string): string {
  const cleaned = hint.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return cleaned || "image";
}

export type SavedImage = { src: string; width: number; height: number };

/**
 * Re-encodes an uploaded image to webp under public/uploads/<kind>/ and
 * reports where it landed plus its intrinsic size.
 *
 * Re-encoding through sharp is also the validation step: it throws on
 * anything that isn't a decodable image regardless of the MIME type the
 * browser claimed, and it strips EXIF/metadata on the way out.
 *
 * Covers are cropped to 3:4 to match the blog's `.cover-frame`, the single
 * shape every cover is shown in; in-article images keep their own proportions.
 *
 * An animated GIF or WebP keeps its animation: sharp only reads the first
 * frame unless it is told the input has pages, and the encoder only writes
 * an animated webp if it was decoded that way. Rotation is skipped for those
 * — sharp cannot rotate a multi-frame image, and an animation carrying EXIF
 * orientation is vanishingly rare next to a still photo that does.
 */
export async function saveImage(file: File, kind: UploadKind, slugHint: string): Promise<SavedImage> {
  if (file.size === 0) {
    throw new UploadError({ reason: "empty", message: "Файл пустой — выберите изображение." });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadError({
      reason: "too-large",
      message: `Файл больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ — сожмите изображение.`,
    });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Decode and write are deliberately separate try/catch blocks: they fail
  // for completely different reasons and used to be reported to the editor
  // with the same "проверьте файл" message, which sent people hunting for a
  // format problem when the real cause was a non-writable uploads volume.
  let encoded: Buffer;
  let width = 0;
  let height = 0;
  try {
    const animated = ((await sharp(buffer).metadata()).pages ?? 1) > 1;
    const base = sharp(buffer, { animated });
    const pipeline = animated ? base : base.rotate();
    const result = await (kind === "covers"
      ? pipeline.resize({ width: 1200, height: 1600, fit: "cover" })
      : pipeline.resize({ width: CONTENT_MAX_EDGE, height: CONTENT_MAX_EDGE, fit: "inside", withoutEnlargement: true })
    )
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
    encoded = result.data;
    width = result.info.width;
    // An animated webp reports the whole frame strip in `height`; the blog
    // reserves space per frame, so it needs the height of one page.
    height = result.info.pageHeight ?? result.info.height;
  } catch (err) {
    throw new UploadError({
      reason: "decode",
      message: `Не удалось прочитать изображение. Поддерживаются: ${ACCEPTED_FORMATS.join(", ")}. Ошибка: ${
        (err as Error).message
      }`,
    });
  }

  const dir = path.join(PUBLIC_DIR, kind);
  const filename = `${safeStem(slugHint)}-${crypto.randomBytes(6).toString("hex")}.webp`;

  try {
    await fs.promises.mkdir(dir, { recursive: true });
    await fs.promises.writeFile(path.join(dir, filename), encoded);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code ?? "UNKNOWN";
    // EACCES here means the ./uploads bind mount from docker-compose.yml is
    // not writable by the container's `nextjs` user (uid 1001) — the
    // Dockerfile's chown runs before the mount, so the host directory's
    // ownership wins. Fix on the VPS: `sudo chown -R 1001:1001 uploads`.
    const hint =
      code === "EACCES" || code === "EPERM"
        ? "нет прав на запись в каталог загрузок (на сервере: sudo chown -R 1001:1001 uploads)"
        : code === "ENOSPC"
          ? "на диске закончилось место"
          : `код ${code}`;
    throw new UploadError({
      reason: "write",
      message: `Изображение прочитано, но не сохранено на сервере — ${hint}.`,
      detail: `${code}: ${(err as Error).message}`,
    });
  }

  return { src: `/uploads/${kind}/${filename}`, width, height };
}
