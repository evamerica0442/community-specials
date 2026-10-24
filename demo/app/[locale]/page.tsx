import fs from 'node:fs';
import path from 'node:path';

import Link from 'next/link';
import { notFound } from 'next/navigation';

import {
  demoSite,
  getActiveSpecials,
  sitesFileSchema,
  specialsFileSchema,
  type Locale,
} from 'community-specials';
import { SpecialsGrid, SpecialsStrip } from 'community-specials/components';

type CopyStrings = {
  title: string;
  intro: string;
  stripHeading: string;
  gridHeading: string;
  keyboard: string;
  language: string;
  theming: string;
};

const COPY: Record<Locale, CopyStrings> = {
  en: {
    title: 'Community specials — component demo',
    intro:
      'This page renders the shared specials components with the built-in sample flyers. They are not real businesses.',
    stripHeading: 'SpecialsStrip',
    gridHeading: 'SpecialsGrid',
    keyboard: 'Keyboard: Tab to a card and press Enter to open the lightbox. Escape closes it and returns focus.',
    language: 'Afrikaans version',
    theming: 'The accent colour, background, radius and text colours are CSS custom properties a site can override.',
  },
  af: {
    title: 'Gemeenskapsaanbiedinge — komponent-demo',
    intro:
      'Hierdie bladsy toon die gedeelde aanbiedingkomponente met die ingeboude voorbeeld-baniere. Hulle is nie regte besighede nie.',
    stripHeading: 'SpecialsStrip',
    gridHeading: 'SpecialsGrid',
    keyboard: 'Sleutelbord: Tab na ’n kaart en druk Enter om die ligboks oop te maak. Escape maak dit toe en gee die fokus terug.',
    language: 'Engelse weergawe',
    theming: 'Die aksentkleur, agtergrond, radius en tekskleure is CSS-eienskappe wat ’n webwerf kan oorskryf.',
  },
} satisfies Record<Locale, Record<string, string>>;

export function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'af' }];
}

export default async function DemoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  if (rawLocale !== 'en' && rawLocale !== 'af') notFound();
  const locale: Locale = rawLocale;
  const copy = COPY[locale];
  const otherLocale = locale === 'en' ? 'af' : 'en';

  const repoRoot = path.resolve(process.cwd(), '..');
  const specials = specialsFileSchema.parse(
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'specials.json'), 'utf8')),
  );
  const sites = sitesFileSchema.parse(
    JSON.parse(fs.readFileSync(path.join(repoRoot, 'sites.json'), 'utf8')),
  );
  const items = getActiveSpecials(specials, {
    siteId: demoSite.id,
    sites: [...sites, demoSite],
  });

  return (
    <main style={{ maxWidth: '64rem', margin: '0 auto', padding: '2rem 1rem 4rem' }}>
      <p>
        <Link href={`/${otherLocale}/`} hrefLang={otherLocale}>
          → {copy.language}
        </Link>
      </p>
      <h1>{copy.title}</h1>
      <p>{copy.intro}</p>
      <p>
        <small>{copy.keyboard}</small>
      </p>
      <p>
        <small>{copy.theming}</small>
      </p>

      <h2>{copy.stripHeading}</h2>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem' }}>
        <SpecialsStrip items={items} locale={locale} />
      </div>

      <h2>{copy.gridHeading}</h2>
      <div style={{ background: '#fff', borderRadius: '1rem', padding: '1rem' }}>
        <SpecialsGrid items={items} locale={locale} />
      </div>
    </main>
  );
}
