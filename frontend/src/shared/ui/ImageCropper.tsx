import { useId, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';

import { useModalBehavior } from './Modal/model/useModalBehavior';

const VIEW = 240;
const OUTPUT_MAX = 800;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.1;
const NUDGE = 12;
const JPEG_QUALITY = 0.92;

interface Size {
  width: number;
  height: number;
}

interface Pose {
  zoom: number;
  x: number;
  y: number;
}

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  pose: Pose;
}

interface ImageCropperProps {
  file: File;
  url: string;
  onApply: (file: File) => void;
  onCancel: () => void;
}

function baseScale(size: Size): number {
  return Math.max(VIEW / size.width, VIEW / size.height);
}

function clamp(pose: Pose, size: Size): Pose {
  const scale = baseScale(size) * pose.zoom;
  const minX = VIEW - size.width * scale;
  const minY = VIEW - size.height * scale;

  return {
    zoom: pose.zoom,
    x: Math.min(0, Math.max(minX, pose.x)),
    y: Math.min(0, Math.max(minY, pose.y)),
  };
}

function centered(size: Size): Pose {
  const scale = baseScale(size);
  return clamp(
    { zoom: 1, x: (VIEW - size.width * scale) / 2, y: (VIEW - size.height * scale) / 2 },
    size,
  );
}

function zoomed(pose: Pose, size: Size, zoom: number): Pose {
  const next = Math.min(ZOOM_MAX, Math.max(1, zoom));
  const base = baseScale(size);
  const centerX = (VIEW / 2 - pose.x) / (base * pose.zoom);
  const centerY = (VIEW / 2 - pose.y) / (base * pose.zoom);

  return clamp(
    { zoom: next, x: VIEW / 2 - centerX * base * next, y: VIEW / 2 - centerY * base * next },
    size,
  );
}

function outputName(file: File, mime: string): string {
  const stem = file.name.replace(/\.[^.]+$/, '') || 'photo';
  return `${stem}.${mime === 'image/png' ? 'png' : 'jpg'}`;
}

export function ImageCropper({ file, url, onApply, onCancel }: ImageCropperProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const titleId = useId();
  const [size, setSize] = useState<Size | null>(null);
  const [pose, setPose] = useState<Pose>({ zoom: 1, x: 0, y: 0 });
  const [failed, setFailed] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useModalBehavior(panelRef, onCancel, isApplying);

  const scale = size ? baseScale(size) * pose.zoom : 1;

  const handleLoad = () => {
    const image = imageRef.current;
    if (!image) return;

    const next = { width: image.naturalWidth, height: image.naturalHeight };
    if (next.width === 0 || next.height === 0) {
      setFailed(true);
      return;
    }

    setSize(next);
    setPose(centered(next));
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!size) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      pose,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || !size || drag.pointerId !== event.pointerId) return;

    setPose(
      clamp(
        {
          zoom: drag.pose.zoom,
          x: drag.pose.x + event.clientX - drag.startX,
          y: drag.pose.y + event.clientY - drag.startY,
        },
        size,
      ),
    );
  };

  const handlePointerEnd = () => {
    dragRef.current = null;
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!size) return;

    const moves: Record<string, [number, number]> = {
      ArrowLeft: [NUDGE, 0],
      ArrowRight: [-NUDGE, 0],
      ArrowUp: [0, NUDGE],
      ArrowDown: [0, -NUDGE],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      setPose(clamp({ ...pose, x: pose.x + move[0], y: pose.y + move[1] }, size));
      return;
    }

    if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      setPose(zoomed(pose, size, pose.zoom + ZOOM_STEP));
    } else if (event.key === '-') {
      event.preventDefault();
      setPose(zoomed(pose, size, pose.zoom - ZOOM_STEP));
    }
  };

  const handleApply = () => {
    const image = imageRef.current;
    if (!image || !size) return;

    setIsApplying(true);

    const source = VIEW / scale;
    const side = Math.max(1, Math.min(OUTPUT_MAX, Math.round(source)));
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const canvas = document.createElement('canvas');
    canvas.width = side;
    canvas.height = side;

    const context = canvas.getContext('2d');
    if (!context) {
      setFailed(true);
      setIsApplying(false);
      return;
    }

    if (mime === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, side, side);
    }
    context.drawImage(image, -pose.x / scale, -pose.y / scale, source, source, 0, 0, side, side);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setFailed(true);
          setIsApplying(false);
          return;
        }
        onApply(new File([blob], outputName(file, mime), { type: mime }));
      },
      mime,
      JPEG_QUALITY,
    );
  };

  return (
    <div
      className="u-crop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isApplying) onCancel();
      }}
    >
      <div
        ref={panelRef}
        className="u-crop-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <h2 id={titleId} className="u-crop-title">
          Обрезка фото
        </h2>

        <div data-modal-body className="u-crop-body">
          <div
            className="u-crop-view"
            role="group"
            aria-label="Область обрезки. Стрелки двигают фото, плюс и минус меняют масштаб."
            tabIndex={0}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
            onKeyDown={handleKeyDown}
          >
            <img
              ref={imageRef}
              src={url}
              alt=""
              draggable={false}
              className="u-crop-img"
              data-ready={size ? '' : undefined}
              style={
                size
                  ? {
                      width: size.width * scale,
                      height: size.height * scale,
                      transform: `translate(${pose.x}px, ${pose.y}px)`,
                    }
                  : undefined
              }
              onLoad={handleLoad}
              onError={() => setFailed(true)}
            />
            <span className="u-crop-mask" aria-hidden />
          </div>

          <p className="u-crop-note">Перетащите фото и выберите масштаб. В профиле будет виден кружок.</p>

          <label className="u-crop-zoom">
            <span>Масштаб</span>
            <input
              type="range"
              min={1}
              max={ZOOM_MAX}
              step={0.01}
              value={pose.zoom}
              disabled={!size}
              onChange={(event) => {
                if (size) setPose(zoomed(pose, size, Number(event.target.value)));
              }}
            />
          </label>

          {failed && (
            <p role="alert" className="u-crop-error">
              Не удалось открыть фото для обрезки.
            </p>
          )}

          <div className="u-crop-actions">
            <button type="button" className="u-btn-ghost" onClick={onCancel} disabled={isApplying}>
              Отмена
            </button>
            {failed ? (
              <button type="button" className="u-btn" onClick={() => onApply(file)}>
                Загрузить как есть
              </button>
            ) : (
              <button
                type="button"
                className="u-btn"
                onClick={handleApply}
                disabled={!size || isApplying}
              >
                Применить
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
