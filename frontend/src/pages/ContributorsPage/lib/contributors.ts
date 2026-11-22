import badyan from '../assets/badyan.jpg';
import chekaninVladislav from '../assets/chekanin-vladislav.jpg';
import lebedevAlex from '../assets/lebedev-alex.jpg';
import malovaIana from '../assets/malova-iana.jpg';
import medvedevVadim from '../assets/medvedev-vadim.jpg';
import osipovaKsenia from '../assets/osipova-ksenia.jpg';
import ryabtcev from '../assets/ryabtcev.jpg';
import stankov from '../assets/stankov.jpg';
import vdovenkoDanil from '../assets/vdovenko-danil.jpg';
import veznovets from '../assets/veznovets.jpg';

/**
 * Запись в списке благодарностей.
 *
 * Ключа `id` у неё нет, в отличие от оригинала. Там числа шли
 * 1…13, 15…17 — четырнадцатого удалили в старом портале. Искать запись
 * по номеру нет необходимости: список статический, эндпоинта у него нет,
 * ссылок на карточку тоже. Единственное, ради чего номер существовал, —
 * ключ React, а имена в списке уникальны.
 */
export interface Contributor {
  /** ФИО так, как его написали в оригинале. Он же ключ списка. */
  name: string;

  /** Роль в работе над порталом: «Тимлид», «Backend-разработчик». */
  role: string;

  /**
   * Фотография. У некоторых записей её нет — вместо неё общая заглушка портала,
   * та же, что у пользователя без аватара.
   */
  photo?: {
    src: string;
    width: number;
    height: number;
  };
}

/**
 * Содержимое страницы `views/uits/public/about/contributors` старого портала,
 * перенесённое со списком участников и подписями ролей.
 *
 * Данные, а не разметка, по той же причине, что у истории кафедры:
 * карточки отличаются только именем, ролью и снимком. Разница с историей
 * в том, что там разметкой было 359 строк, а здесь оригинал сам держал
 * список данными.
 *
 * Ручки в API нет: список статический, правка выполняется через данные в коде.
 *
 * ### Что поправлено по дороге
 *
 * Размеры снимков проставлены здесь, а не подбираются браузером: без них
 * сетка из шестнадцати кружков прыгает, пока фотографии доезжают. Числа —
 * фактические, после пережатия (D-F5): 300 пикселей по меньшей стороне.
 *
 * Снимки — импорты, а не строки адресов: так они идут через сборщик
 * и получают хеш в имени, а с ним и вечный кэш (D-F16).
 *
 * ### Чего здесь нет
 *
 * `alt` у снимков — намеренно. Имя стоит подписью прямо под фотографией,
 * и продублированное в `alt` оно читалось бы диктором дважды. В оригинале
 * там было `[alt]="contributor.name"` — ровно этот случай. Решение то же,
 * что у карточек ППС и УВП: снимок декоративный, подпись текстом.
 */
export const CONTRIBUTORS: readonly Contributor[] = [
  {
    name: 'Чеканин Владислав Александрович',
    role: 'Руководитель',
    photo: { src: chekaninVladislav, width: 300, height: 300 },
  },
  {
    name: 'Малова Яна',
    role: 'Тимлид, fullstack-разработчик',
    photo: { src: malovaIana, width: 300, height: 306 },
  },
  {
    name: 'Ерин Сергей',
    role: 'Разработчик',
  },
  {
    name: 'Медведев Вадим',
    role: 'Разработчик, ревьюер кода',
    photo: { src: medvedevVadim, width: 300, height: 300 },
  },
  {
    name: 'Вдовенко Данил',
    role: 'Devops, ревьюер кода',
    photo: { src: vdovenkoDanil, width: 300, height: 300 },
  },
  {
    name: 'Осипова Ксения',
    role: 'Backend-разработчик',
    photo: { src: osipovaKsenia, width: 300, height: 300 },
  },
  {
    name: 'Вежновец Дмитрий',
    role: 'Frontend-разработчик',
    photo: { src: veznovets, width: 300, height: 389 },
  },
  {
    name: 'Рябцев Михаил',
    role: 'Backend-разработчик',
    photo: { src: ryabtcev, width: 300, height: 385 },
  },
  {
    name: 'Шостов Дмитрий',
    role: 'Backend-разработчик',
  },
  {
    name: 'Лебедев Александр',
    role: 'Frontend-разработчик',
    photo: { src: lebedevAlex, width: 300, height: 420 },
  },
  {
    name: 'Мокроусова Лариса',
    role: 'Frontend-разработчик',
  },
  {
    name: 'Станьков Дмитрий',
    role: 'Frontend-разработчик',
    photo: { src: stankov, width: 300, height: 346 },
  },
  {
    name: 'Бадян Ксения и Анастасия',
    role: 'Frontend-разработчик',
    photo: { src: badyan, width: 300, height: 401 },
  },
  {
    name: 'Золотухин Иван',
    role: 'Fullstack-разработчик',
  },
  {
    name: 'Мальцев Тимофей',
    role: 'Backend-разработчик',
  },
  {
    name: 'Вьев Сергей',
    role: 'Backend-разработчик',
  },
];
