const ICON_ATTRS =
  'viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" ' +
  'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"';

function navButton(label: string, path: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.setAttribute('aria-label', label);
  button.title = label;
  button.innerHTML = `<svg ${ICON_ATTRS}><path d="${path}"/></svg>`;

  return button;
}

function isGalleryTable(table: HTMLTableElement): boolean {
  const cells = Array.from(table.querySelectorAll('td'));

  return (
    cells.length > 0 &&
    table.querySelector('th') === null &&
    cells.every((cell) => cell.querySelector('img') !== null)
  );
}

/**
 * Таблица из одних фото (так редактор хранит фото-блок, разбор в
 * `RichTextEditor/lib/gallery.ts`) превращается в карусель: фото листаются
 * свайпом, стрелками рядом и стрелками клавиатуры, под ними счётчик.
 * Таблица с текстом остаётся таблицей.
 *
 * Работает руками по готовой разметке, а не React'ом: HTML приходит
 * строкой из базы, и вставляется она как есть. Класс на таблице
 * не даёт обработать её дважды.
 */
export function enhanceGalleries(root: HTMLElement): void {
  root.querySelectorAll('table').forEach((table) => {
    if (table.classList.contains('u-gallery') || !isGalleryTable(table)) return;

    table.classList.add('u-gallery');

    const box = document.createElement('div');
    box.className = 'u-gallery-box';
    table.replaceWith(box);
    box.append(table);

    const row = table.querySelector('tr');
    const cells = Array.from(table.querySelectorAll('td'));
    if (!row || cells.length < 2) return;

    const total = cells.length;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

    row.tabIndex = 0;
    row.setAttribute('role', 'group');
    row.setAttribute('aria-roledescription', 'карусель');
    row.setAttribute('aria-label', 'Фотографии');

    const prev = navButton('Предыдущее фото', 'm15 18-6-6 6-6');
    const next = navButton('Следующее фото', 'm9 18 6-6-6-6');
    const count = document.createElement('span');
    count.className = 'u-gallery-count';
    count.setAttribute('aria-live', 'polite');

    const nav = document.createElement('div');
    nav.className = 'u-gallery-nav';
    nav.append(prev, count, next);
    box.append(nav);

    const step = () => {
      const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0;

      return (cells[0]?.offsetWidth || row.clientWidth) + gap;
    };

    const current = () =>
      Math.min(total - 1, Math.max(0, Math.round(row.scrollLeft / Math.max(1, step()))));

    let frame = 0;
    const update = () => {
      frame = 0;
      const index = current();

      count.textContent = `${index + 1} / ${total}`;
      prev.disabled = index === 0;
      next.disabled = index === total - 1;
    };

    const go = (direction: -1 | 1) =>
      row.scrollBy({ left: direction * step(), behavior: reduceMotion ? 'auto' : 'smooth' });

    row.addEventListener(
      'scroll',
      () => {
        if (!frame) frame = requestAnimationFrame(update);
      },
      { passive: true },
    );
    prev.addEventListener('click', () => go(-1));
    next.addEventListener('click', () => go(1));
    row.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft') go(-1);
      else if (event.key === 'ArrowRight') go(1);
      else return;

      event.preventDefault();
    });

    update();
  });
}
