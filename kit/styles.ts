/**
 * The plain CSS behind <SpecialsStrip /> and <SpecialsGrid />, injected once
 * at render time. No Tailwind, no framework — every visual token is a CSS
 * custom property so each site can theme the components:
 *
 *   --specials-accent   border, focus ring and buttons
 *   --specials-bg       card background
 *   --specials-ink      business name text
 *   --specials-muted    small labels
 *   --specials-radius   corner roundness
 *
 * Set them on :root or on a wrapper around the components.
 */
export const SPECIALS_CSS = `
.cs-root {
  --specials-accent: #7b1e3a;
  --specials-bg: #ffffff;
  --specials-ink: #1f1710;
  --specials-muted: #6b5d4f;
  --specials-radius: 14px;
  color: var(--specials-ink);
  font: inherit;
}
.cs-strip-wrap { position: relative; }
.cs-strip {
  display: flex;
  gap: 1rem;
  list-style: none;
  margin: 0;
  padding: 0.25rem 0.25rem 0.75rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  scrollbar-width: thin;
}
.cs-strip > li {
  flex: 0 0 clamp(11rem, 58vw, 15rem);
  scroll-snap-align: start;
}
@media (min-width: 48rem) {
  .cs-strip > li {
    flex: 0 0 calc((100% - 3rem) / 4);
  }
}
.cs-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
  list-style: none;
  margin: 0;
  padding: 0.25rem;
}
.cs-card {
  display: block;
  width: 100%;
  padding: 0;
  border: 1px solid color-mix(in srgb, var(--specials-accent) 45%, transparent);
  border-radius: var(--specials-radius);
  background: var(--specials-bg);
  box-shadow: 0 10px 24px -18px rgb(31 23 16 / 0.55);
  overflow: hidden;
  cursor: zoom-in;
  font: inherit;
  color: inherit;
  text-align: left;
}
.cs-card:focus-visible {
  outline: 3px solid var(--specials-accent);
  outline-offset: 2px;
}
.cs-card-media {
  display: block;
  aspect-ratio: 3 / 4;
  width: 100%;
  overflow: hidden;
}
.cs-card-media img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cs-card-meta { display: block; padding: 0.6rem 0.7rem 0.35rem; }
.cs-card-name {
  display: block;
  font-weight: 650;
  font-size: 0.95rem;
  line-height: 1.25;
}
.cs-card-tag {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.75rem;
  color: var(--specials-muted);
}
.cs-card-cta {
  display: block;
  padding: 0 0.7rem 0.65rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--specials-accent);
}
.cs-18 {
  display: block;
  margin: 0 0.7rem 0.7rem;
  padding: 0.35rem 0.5rem;
  border: 1px solid var(--specials-accent);
  border-radius: calc(var(--specials-radius) / 2);
  font-size: 0.72rem;
  font-weight: 700;
  text-align: center;
  color: var(--specials-accent);
}
.cs-nav {
  display: none;
  position: absolute;
  top: 38%;
  z-index: 2;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--specials-accent) 45%, transparent);
  background: var(--specials-bg);
  color: var(--specials-accent);
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 6px 16px -10px rgb(31 23 16 / 0.6);
}
.cs-nav:focus-visible {
  outline: 3px solid var(--specials-accent);
  outline-offset: 2px;
}
@media (min-width: 48rem) {
  .cs-nav { display: inline-flex; align-items: center; justify-content: center; }
}
.cs-nav--prev { left: -0.4rem; }
.cs-nav--next { right: -0.4rem; }
.cs-disclaimer {
  margin: 0.5rem 0.25rem 0;
  font-size: 0.78rem;
  color: var(--specials-muted);
}
/* Lightbox */
.cs-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 1rem;
  background: rgb(20 14 9 / 0.9);
}
.cs-overlay *,
.cs-overlay { box-sizing: border-box; }
.cs-stage {
  position: relative;
  max-width: min(92vw, 34rem);
  max-height: 76vh;
  overflow: hidden;
  border-radius: var(--specials-radius);
  background: var(--specials-bg);
  touch-action: none;
  cursor: grab;
}
.cs-stage img {
  display: block;
  max-width: 100%;
  max-height: 76vh;
  width: auto;
  height: auto;
  user-select: none;
  -webkit-user-drag: none;
  transform: translate(var(--cs-pan-x, 0px), var(--cs-pan-y, 0px)) scale(var(--cs-zoom, 1));
  transform-origin: center center;
  transition: transform 160ms ease-out;
}
.cs-stage--no-motion img { transition: none; }
.cs-18--overlay {
  display: block;
  width: fit-content;
  margin: 0 auto;
  padding: 0.4rem 0.7rem;
  border: 2px solid #f6efdf;
  border-radius: 999px;
  background: rgb(20 14 9 / 0.65);
  color: #f6efdf;
  font-size: 0.85rem;
  font-weight: 700;
}
.cs-overlay-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
}
.cs-btn {
  padding: 0.55rem 0.95rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--specials-accent) 45%, transparent);
  background: var(--specials-bg);
  color: var(--specials-accent);
  font: inherit;
  font-weight: 650;
  font-size: 0.9rem;
  cursor: pointer;
}
.cs-btn:focus-visible {
  outline: 3px solid var(--specials-accent);
  outline-offset: 2px;
}
.cs-btn--visit {
  background: var(--specials-accent);
  color: var(--specials-bg);
  text-decoration: none;
}
.cs-btn--icon { padding: 0.55rem 0.8rem; }
@media (prefers-reduced-motion: reduce) {
  .cs-stage img { transition: none; }
  .cs-strip { scroll-behavior: auto; }
}
`;
