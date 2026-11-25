import yandex from './assets/yandex.png';
import sber from './assets/sber.png';
import ozon from './assets/ozon.png';
import bis from './assets/bis.png';
import domrf from './assets/domrf.png';
import elbius from './assets/elbius.png';
import evtika from './assets/evtika.gif';
import farmsolutions from './assets/farmsolutions.png';
import gramant from './assets/gramant.png';
import hrunichev from './assets/hrunichev.png';
import ipu from './assets/ipu.jpg';
import konsaltika from './assets/konsaltika.jpg';
import krok from './assets/krok.png';
import lanit from './assets/lanit.jpg';
import liga from './assets/liga.png';
import pfr from './assets/pfr.jpg';
import rbs from './assets/rbs.png';
import rks from './assets/rks.png';
import strahovanie from './assets/strahovanie.jpg';
import taxcom from './assets/taxcom.jpg';
import tot from './assets/tot.png';
import trukonf from './assets/trukonf.png';
import vsk from './assets/vsk.png';
import zenit from './assets/zenit.png';

const partners = [
  { src: yandex, name: 'Яндекс' },
  { src: sber, name: 'Сбербанк' },
  { src: ozon, name: 'Ozon' },
  { src: bis, name: 'Банковские информационные системы' },
  { src: domrf, name: 'Дом РФ' },
  { src: elbius, name: 'Элбиус' },
  { src: evtika, name: 'Эврика' },
  { src: farmsolutions, name: 'Фарм Солюшенс' },
  { src: gramant, name: 'Gramant' },
  { src: hrunichev, name: 'Государственный космический научно-производственный центр имени М.В. Хруничева' },
  { src: ipu, name: 'ИПУ РАН' },
  { src: konsaltika, name: 'Консалтика' },
  { src: krok, name: 'КРОК' },
  { src: lanit, name: 'Ланит' },
  { src: liga, name: 'Лига цифровой экономики' },
  { src: pfr, name: 'ПФР' },
  { src: rbs, name: 'Российские банковские системы' },
  { src: rks, name: 'Российская корпорация ракетно-космического приборостроения и информационных систем' },
  { src: strahovanie, name: 'Сбер страхования' },
  { src: taxcom, name: 'Taxcom' },
  { src: tot, name: 'Системы управления инновациями' },
  { src: trukonf, name: 'Труконф' },
  { src: vsk, name: 'ВСК страховой дом' },
  { src: zenit, name: 'Зенит' },
];

export default function PartnersPage() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-gutter">
      <header className="flex flex-col gap-2">
        <h1 className="text-h4 text-text-heading">Наши партнёры</h1>
        <p>Мы сотрудничаем с ведущими ИТ-компаниями и организациями.</p>
      </header>

      <ul className="grid grid-cols-2 gap-gutter-sm sm:grid-cols-3 lg:grid-cols-5">
        {partners.map(({ src, name }) => (
          <li key={name} className="flex h-28 items-center justify-center rounded bg-white p-4 shadow-sm">
            <img src={src} alt={name} loading="lazy" className="max-h-full max-w-full object-contain" />
          </li>
        ))}
      </ul>
    </div>
  );
}
