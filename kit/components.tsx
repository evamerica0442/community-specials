'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { SpecialsLightbox } from './lightbox.js';
import type { Locale, Special } from './schemas.js';
import { isActiveOnDate } from './specials.js';
import { SPECIALS_CSS } from './styles.js';

/** The subset of a special the components need; SyncedItem fits too. */
export type DisplayItem = Pick<
  Special,
  | 'id'
  | 'businessName'
  | 'flyer'
  | 'altEn'
  | 'altAf'
  | 'captionEn'
  | 'captionAf'
  | 'url'
  | 'category'
  | 'startDate'
  | 'endDate'
> & { localFile?: string };

export type SpecialsLabels = {
  localBusiness: string;
  visitTheirPage: string;
  close: string;
  zoomIn: string;
  zoomOut: string;
  scrollBack: string;
  scrollForward: string;
  adultsOnly: string;
  disclaimer: string;
};

const LABELS: Record<Locale, SpecialsLabels> = {
  en: {
    localBusiness: 'Local business',
    visitTheirPage: 'Visit their page',
    close: 'Close',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    scrollBack: 'Scroll back',
    scrollForward: 'Scroll forward',
    adultsOnly: '18+ · Not for persons under 18',
    disclaimer: 'Specials are supplied by the businesses. Prices and availability are set by them.',
  },
  af: {
    localBusiness: 'Plaaslike besigheid',
    visitTheirPage: 'Besoek hul blad',
    close: 'Maak toe',
    zoomIn: 'Maak groter',
    zoomOut: 'Maak kleiner',
    scrollBack: 'Rol terug',
    scrollForward: 'Rol vorentoe',
    adultsOnly: '18+ · Nie vir persone onder 18 nie',
    disclaimer: 'Aanbiedinge word deur die besighede verskaf. Pryse en beskikbaarheid word deur hulle bepaal.',
  },
};

export type SpecialsComponentsProps = {
  items: DisplayItem[];
  locale: Locale;
  /** Override any built-in label (both languages stay your responsibility). */
  labels?: Partial<SpecialsLabels>;
  /** Absolute path the flyer files are served from, e.g. "/specials". Default "/". */
  basePath?: string;
};

let stylesInjected = false;

function SpecialsStyle() {
  if (stylesInjected) return null;
  stylesInjected = true;
  return <style>{SPECIALS_CSS}</style>;
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function resolveLabels(locale: Locale, labels?: Partial<SpecialsLabels>): SpecialsLabels {
  return { ...LABELS[locale], ...labels };
}

function flyerSrc(basePath: string, item: DisplayItem): string {
  const file = item.localFile ?? item.flyer;
  return `${basePath.replace(/\/+$/, '')}/${file}`;
}

function SpecialCard({
  item,
  locale,
  labels,
  basePath,
  onOpen,
}: {
  item: DisplayItem;
  locale: Locale;
  labels: SpecialsLabels;
  basePath: string;
  onOpen: (item: DisplayItem) => void;
}) {
  const alt = locale === 'af' ? item.altAf : item.altEn;
  return (
    <li>
      <button
        type="button"
        className="cs-card"
        onClick={() => onOpen(item)}
        aria-haspopup="dialog"
        aria-label={`${item.businessName} — ${labels.visitTheirPage}`}
      >
        <span className="cs-card-media">
          <img
            src={flyerSrc(basePath, item)}
            alt={alt}
            width={1080}
            height={1440}
            loading="lazy"
            draggable={false}
          />
        </span>
        <span className="cs-card-meta">
          <span className="cs-card-name">{item.businessName}</span>
          <span className="cs-card-tag">{labels.localBusiness}</span>
        </span>
        <span className="cs-card-cta">{labels.visitTheirPage}</span>
        {item.category === 'liquor' ? <span className="cs-18">{labels.adultsOnly}</span> : null}
      </button>
    </li>
  );
}

function useLightbox() {
  const [openItem, setOpenItem] = useState<DisplayItem | null>(null);
  const close = useCallback(() => setOpenItem(null), []);
  const lightbox = (labels: SpecialsLabels, basePath: string, locale: Locale) =>
    openItem ? (
      <SpecialsLightbox
        item={openItem}
        locale={locale}
        labels={labels}
        src={flyerSrc(basePath, openItem)}
        onClose={close}
      />
    ) : null;
  return { openItem: setOpenItem, lightbox };
}

/**
 * A sideways-scrolling strip. About 1.5 cards are visible on a phone so the
 * scroll is obvious; on desktop about 4 cards show with prev/next buttons.
 * Renders nothing at all when there is nothing to show.
 */
export function SpecialsStrip({ items, locale, labels: labelOverrides, basePath = '/' }: SpecialsComponentsProps) {
  const labels = resolveLabels(locale, labelOverrides);
  const reducedMotion = useReducedMotion();
  const trackRef = useRef<HTMLUListElement>(null);
  const { openItem, lightbox } = useLightbox();

  // Client-side safety net: never render an expired special, whatever the
  // caller handed us.
  const active = items.filter((item) => isActiveOnDate(item));
  if (active.length === 0) return null;

  const scroll = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  };

  return (
    <section className="cs-root">
      <SpecialsStyle />
      <div className="cs-strip-wrap">
        <button
          type="button"
          className="cs-nav cs-nav--prev"
          onClick={() => scroll(-1)}
          aria-label={labels.scrollBack}
        >
          ‹
        </button>
        <ul className="cs-strip" ref={trackRef}>
          {active.map((item) => (
            <SpecialCard
              key={item.id}
              item={item}
              locale={locale}
              labels={labels}
              basePath={basePath}
              onOpen={openItem}
            />
          ))}
        </ul>
        <button
          type="button"
          className="cs-nav cs-nav--next"
          onClick={() => scroll(1)}
          aria-label={labels.scrollForward}
        >
          ›
        </button>
      </div>
      <p className="cs-disclaimer">{labels.disclaimer}</p>
      {lightbox(labels, basePath, locale)}
    </section>
  );
}

/**
 * A responsive grid with the same cards and lightbox. Renders nothing at
 * all when there is nothing to show.
 */
export function SpecialsGrid({ items, locale, labels: labelOverrides, basePath = '/' }: SpecialsComponentsProps) {
  const labels = resolveLabels(locale, labelOverrides);
  const { openItem, lightbox } = useLightbox();

  const active = items.filter((item) => isActiveOnDate(item));
  if (active.length === 0) return null;

  return (
    <section className="cs-root">
      <SpecialsStyle />
      <ul className="cs-grid">
        {active.map((item) => (
          <SpecialCard
            key={item.id}
            item={item}
            locale={locale}
            labels={labels}
            basePath={basePath}
            onOpen={openItem}
          />
        ))}
      </ul>
      <p className="cs-disclaimer">{labels.disclaimer}</p>
      {lightbox(labels, basePath, locale)}
    </section>
  );
}
