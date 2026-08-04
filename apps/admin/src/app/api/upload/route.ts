import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { saveImage, UploadError, MAX_UPLOAD_BYTES, type UploadKind } from "@/lib/upload";

// Images are uploaded here rather than as part of the article form submit.
// Two reasons: an in-article image needs a URL before the article is saved,
// and a failed upload can no longer take a half-written article down with it
// (which is what made a bad file wipe every field on the form).
export const runtime = "nodejs";

const KINDS = new Set<UploadKind>(["covers", "content"]);

function isSameOrigin(req: NextRequest): boolean {
  // Cookie-authenticated multipart POSTs are exactly the shape a cross-site
  // form can forge, and unlike Server Actions a Route Handler gets no origin
  // check for free.
  if (req.headers.get("sec-fetch-site") === "same-origin") return true;
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host === req.headers.get("host");
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.admin) {
    return NextResponse.json({ error: "Сессия истекла — войдите заново." }, { status: 401 });
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Запрос отклонён (cross-origin)." }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: `Файл не долетел до сервера — возможно, он больше ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} МБ.` },
      { status: 413 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Файл не выбран." }, { status: 400 });
  }

  const kindRaw = String(formData.get("kind") ?? "content") as UploadKind;
  const kind: UploadKind = KINDS.has(kindRaw) ? kindRaw : "content";
  const hint = String(formData.get("slug") ?? "").trim() || kind;

  try {
    const saved = await saveImage(file, kind, hint);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof UploadError) {
      // A write failure is a server misconfiguration, not editor error —
      // log it so it's findable in `docker compose logs admin`.
      if (err.failure.reason === "write") {
        console.error("[upload] write failed:", err.failure.detail);
      }
      return NextResponse.json({ error: err.message }, { status: err.failure.reason === "write" ? 500 : 400 });
    }
    console.error("[upload] unexpected error:", err);
    return NextResponse.json({ error: "Непредвиденная ошибка при загрузке." }, { status: 500 });
  }
}
