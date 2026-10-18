import { Link } from 'react-router';

import { BrandPattern } from '@shared/ui/brand/BrandPattern';

import { plainText } from '../lib/homeFormat';

const CONTACTS_ROUTE = '/about/contacts';
const CONTACTS_PATTERN_SEED = 2024;
const CONTACTS_PATTERN_COLORS = ['#052891'] as const;

const FALLBACK_NOTE = 'Адрес, телефон и e-mail кафедры указаны на странице «Контакты».';

export function ContactsBlock({ text }: { text: string | null }) {
  return (
    <section id="contacts" className="u-contacts" aria-labelledby="h-contacts">
      <BrandPattern
        className="u-contacts-pattern"
        seed={CONTACTS_PATTERN_SEED}
        colors={CONTACTS_PATTERN_COLORS}
      />
      <div className="u-wrap u-contacts-inner">
        <h2 id="h-contacts" className="u-section-title u-small u-muted-title">
          Контакты
        </h2>
        <p className="u-contacts-big">МГТУ «СТАНКИН»</p>
        <p className="u-contacts-note">{text ? plainText(text) : FALLBACK_NOTE}</p>
        <Link className="u-btn-ghost u-nw" to={CONTACTS_ROUTE}>
          Все контакты →
        </Link>
      </div>
    </section>
  );
}
