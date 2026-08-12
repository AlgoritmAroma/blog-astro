"use client";

import { useRef, useState } from "react";

export type Focus = { x: number; y: number };

/** The one shape a cover is ever shown in — `.cover-frame` on the blog. */
const FRAME_RATIO = "3 / 2";

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
 * Lets the editor say which part of the cover the 3:2 frame should keep.
 *
 * Two panels, because they answer different questions and one image cannot
 * answer both: on the left the cover as stored, whole, with the focus point
 * marked — that is where you aim. On the right the frame the blog will show,
 * cropped live — that is what you get. Editing without the second panel is
 * guessing; editing without the first is aiming at something you cannot see.
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
          <span className="cover-focus__caption">Так будет на сайте</span>
          <div className="cover-focus__frame" style={{ aspectRatio: FRAME_RATIO }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" style={{ objectPosition }} />
          </div>
        </div>
      </div>

      <p className="admin-hint">
        Обложка сохраняется целиком, как загружена — обрезает её рамка 3:2 уже на сайте. Точка
        показывает, что рамка обязана оставить в кадре: {focus.x}% / {focus.y}%. Стрелками — точнее.
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
