'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Locale } from './schemas.js';
import type { SpecialsLabels } from './components.js';

export type LightboxItem = {
  id: string;
  businessName: string;
  flyer: string;
  altEn: string;
  altAf: string;
  url: string;
  category: string;
};

type SpecialsLightboxProps = {
  item: LightboxItem;
  locale: Locale;
  labels: SpecialsLabels;
  src: string;
  onClose: () => void;
};

const MIN_SCALE = 1;
const MAX_SCALE = 4;

type PointerInfo = { x: number; y: number };

export function SpecialsLightbox({ item, locale, labels, src, onClose }: SpecialsLightboxProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<Element | null>(null);
  const pointersRef = useRef(new Map<number, PointerInfo>());
  const gestureRef = useRef<{ startDistance: number; startScale: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    const onMediaChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener('change', onMediaChange);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlayRef.current?.querySelector<HTMLElement>('[data-cs-close]')?.focus();

    const focusable = () =>
      Array.from(
        overlayRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? [],
      );
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      if (elements.length === 0) return;
      const first = elements[0]!;
      const last = elements[elements.length - 1]!;
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !overlayRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      media.removeEventListener('change', onMediaChange);
      document.body.style.overflow = previousOverflow;
      const restore = restoreFocusRef.current;
      if (restore instanceof HTMLElement) restore.focus();
    };
  }, [onClose]);

  const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

  // Wheel zoom needs a non-passive listener.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setScale((current) => clampScale(current * Math.exp(-event.deltaY * 0.0015)));
    };
    stage.addEventListener('wheel', onWheel, { passive: false });
    return () => stage.removeEventListener('wheel', onWheel);
  }, []);

  useEffect(() => {
    if (scale === MIN_SCALE) setPan({ x: 0, y: 0 });
  }, [scale]);

  const distance = (a: PointerInfo, b: PointerInfo) => Math.hypot(a.x - b.x, a.y - b.y);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    stageRef.current?.setPointerCapture(event.pointerId);
    const point = { x: event.clientX, y: event.clientY };
    pointersRef.current.set(event.pointerId, point);
    const pointers = pointersRef.current;
    if (pointers.size === 2) {
      const [a, b] = Array.from(pointers.values()) as [PointerInfo, PointerInfo];
      gestureRef.current = { startDistance: distance(a, b), startScale: scale };
      panRef.current = null;
    } else if (pointers.size === 1 && scale > MIN_SCALE) {
      panRef.current = { startX: point.x, startY: point.y, baseX: pan.x, baseY: pan.y };
    }
  }, [scale, pan]);

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (gestureRef.current && pointersRef.current.size === 2) {
      const [a, b] = Array.from(pointersRef.current.values()) as [PointerInfo, PointerInfo];
      const ratio = distance(a, b) / gestureRef.current.startDistance;
      setScale(clampScale(gestureRef.current.startScale * ratio));
    } else if (panRef.current) {
      setPan({
        x: panRef.current.baseX + (event.clientX - panRef.current.startX),
        y: panRef.current.baseY + (event.clientY - panRef.current.startY),
      });
    }
  }, []);

  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) gestureRef.current = null;
    if (pointersRef.current.size === 0) panRef.current = null;
  }, []);

  const zoomBy = (factor: number) => setScale((current) => clampScale(current * factor));

  const alt = locale === 'af' ? item.altAf : item.altEn;
  const isLiquor = item.category === 'liquor';

  return (
    <div className="cs-overlay" role="dialog" aria-modal="true" aria-label={item.businessName} ref={overlayRef}>
      {isLiquor ? <p className="cs-18--overlay">{labels.adultsOnly}</p> : null}
      <div
        className={reducedMotion ? 'cs-stage cs-stage--no-motion' : 'cs-stage'}
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <img
          src={src}
          alt={alt}
          width={1080}
          height={1440}
          draggable={false}
          style={{
            ['--cs-zoom' as string]: scale,
            ['--cs-pan-x' as string]: `${pan.x}px`,
            ['--cs-pan-y' as string]: `${pan.y}px`,
          }}
        />
      </div>
      <div className="cs-overlay-actions">
        <button type="button" className="cs-btn cs-btn--icon" onClick={() => zoomBy(1 / 1.4)} aria-label={labels.zoomOut}>
          −
        </button>
        <button type="button" className="cs-btn cs-btn--icon" onClick={() => zoomBy(1.4)} aria-label={labels.zoomIn}>
          +
        </button>
        <a className="cs-btn cs-btn--visit" href={item.url} target="_blank" rel="noopener noreferrer">
          {labels.visitTheirPage}
        </a>
        <button type="button" className="cs-btn" onClick={onClose} data-cs-close>
          {labels.close}
        </button>
      </div>
    </div>
  );
}
