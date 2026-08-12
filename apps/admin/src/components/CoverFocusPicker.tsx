"use client";

import { useRef, useState } from "react";
import { coverAspectRatio } from "@/lib/cover-frame";

export type Focus = { x: number; y: number };

/** Below this the frame has to upscale, and no crop makes a small image
 * sharp. The cover is stored at whatever it was uploaded at now (nothing is
 * enlarged on the way in), so this is the only place the editor finds out. */
const MIN_COMFORTABLE_WIDTH = 1200;

/** Arrow-key step, in percent. One press should be visible without making the
 * keyboard a slower way to cross the image than it needs to be. */
const STEP = 2;

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Lets the editor say which part of the cover to keep when the frame cannot
 * take all of it.
 *
 * Two panels, because they answer different questions and one image cannot
 * answer both: on the left the cover as stored, whole, with the focus point
 * marked — that is where you aim. On the right the frame the blog will show,
 * cropped live — that is what you get. Editing without the second panel is
 * guessing; editing without the first is aiming at something you cannot see.
 *
 * The right panel takes its shape from `coverAspectRatio`, the same function
 * the blog's card uses, so the two cannot disagree. For most uploads it comes
 * out the same shape as the original and nothing is cropped at all — which is
 * itself worth showing, since it is the answer to "why is my picture cut".
 *
 * The point is stored as percentages and handed to CSS `object-position`,
 * which frames it as closely as the overflow allows and clamps by itself at
 * the edges — so a focus on a corner cannot push the image out of its frame.
 */
export default function CoverFocusPicker({
  src,
  width,
  height,
  focus,
  onChange,
}: {
  src: string;
  /** Intrinsic size of the stored file. 0 for a cover uploaded before the
   * server started reporting it — the small-image warning is skipped rather
   * than guessed at. */
  width: number;
  height: number;
  focus: Focus;
  onChange: (focus: Focus) => void;
}) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  function setFromPointer(clientX: number, clientY: number) {
    const rect = sourceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    onChange({
      x: clamp(((clientX - rect.left) / rect.width) * 100),
      y: clamp(((clientY - rect.top) / rect.height) * 100),
    });
  }

  function onKeyDown(e: React.KeyboardEvent) {
    const moves: Record<string, Focus> = {
      ArrowLeft: { x: -STEP, y: 0 },
      ArrowRight: { x: STEP, y: 0 },
      ArrowUp: { x: 0, y: -STEP },
      ArrowDown: { x: 0, y: STEP },
    };
    const move = moves[e.key];
    if (!move) return;
    e.preventDefault();
    onChange({ x: clamp(focus.x + move.x), y: clamp(focus.y + move.y) });
  }

  const objectPosition = `${focus.x}% ${focus.y}%`;
  const tooSmall = width > 0 && width < MIN_COMFORTABLE_WIDTH;

  const size = width > 0 && height > 0 ? { width, height } : null;
  const frameRatio = coverAspectRatio(size, "card");
  // Within a percent, the frame is the picture's own shape — so the crop is
  // nil and saying "cropped to 3:2" would be a lie the editor can see through.
  const cropped = size ? Math.abs(size.width / size.height - frameRatio) > 0.01 : true;

  return (
    <div className="admin-form-field">
      <label>Кадрирование обложки</label>

      <div className="cover-focus">
        <div className="cover-focus__panel">
          <span className="cover-focus__caption">Оригинал — кликните по главному объекту</span>
          <div
            ref={sourceRef}
            className="cover-focus__source"
            role="slider"
            tabIndex={0}
            aria-label="Точка фокуса обложки — стрелками или мышью"
            aria-valuetext={`по горизонтали ${focus.x}%, по вертикали ${focus.y}%`}
            aria-valuenow={focus.y}
            aria-valuemin={0}
            aria-valuemax={100}
            onKeyDown={onKeyDown}
            onPointerDown={(e) => {
              // Capture makes a drag that leaves the image keep working, so
              // the marker follows the pointer to the edge instead of
              // sticking wherever it last happened to be inside the box.
              e.currentTarget.setPointerCapture(e.pointerId);
              setDragging(true);
              setFromPointer(e.clientX, e.clientY);
            }}
            onPointerMove={(e) => dragging && setFromPointer(e.clientX, e.clientY)}
            onPointerUp={(e) => {
              e.currentTarget.releasePointerCapture(e.pointerId);
              setDragging(false);
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} />
            <span
              className="cover-focus__marker"
              style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            />
          </div>
        </div>

        <div className="cover-focus__panel">
          <span className="cover-focus__caption">Так будет в списке блога</span>
          <div className="cover-focus__frame" style={{ aspectRatio: frameRatio }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={{ objectPosition }} />
          </div>
        </div>
      </div>

      <p className="admin-hint">
        {cropped ? (
          <>
            Обложка сохраняется целиком, как загружена. В ленте она не помещается по высоте, и
            рамка её обрежет — точка показывает, что она обязана оставить в кадре: {focus.x}% /{" "}
            {focus.y}%. Стрелками — точнее.
          </>
        ) : (
          <>
            Обложка помещается в рамку целиком — на сайте она видна вся, ничего не обрезается.
            Точка пригодится, только если загрузить более вытянутый кадр.
          </>
        )}
      </p>

      {tooSmall && (
        <p className="admin-error">
          Обложка узкая — {width}×{height} px. Рамка растянет её, и на широком экране будет мыло.
          Лучше загрузить от {MIN_COMFORTABLE_WIDTH} px по ширине.
        </p>
      )}
    </div>
  );
}
