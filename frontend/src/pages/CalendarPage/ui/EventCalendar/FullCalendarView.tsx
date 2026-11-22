import { useEffect } from 'react';
import FullCalendar, { useCalendarController } from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import listPlugin from '@fullcalendar/react/list';
import ruLocale from '@fullcalendar/react/locales/ru';
import classicThemePlugin from '@fullcalendar/react/themes/classic';
import timeGridPlugin from '@fullcalendar/react/timegrid';

import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import './palette.css';

import type { EventCalendarProps } from './props';

/** Наши виды — в виды FullCalendar. */
const FC_VIEWS = {
  month: 'dayGridMonth',
  week: 'timeGridWeek',
  day: 'timeGridDay',
  list: 'listMonth',
} as const;

const PLUGINS = [dayGridPlugin, timeGridPlugin, listPlugin, classicThemePlugin];

const TIME_FORMAT = { hour: '2-digit', minute: '2-digit', hour12: false } as const;

/**
 * FullCalendar — отдельным куском. Грузится лениво из `index.tsx`,
 * поэтому default export и всё, что тянет библиотеку, — только здесь.
 *
 * **Календарь не хозяин даты и вида, а исполнитель.** Свою панель
 * FullCalendar не рисует (`headerToolbar: false`); вид и дату задаёт
 * страница, а этот компонент переводит их в команды контроллера.
 * Контроллер — единственное, чем v7 позволяет управлять календарём
 * снаружи, и он живёт здесь, чтобы библиотека не попала в основной кусок.
 */
export default function FullCalendarView({ view, anchor, items, onItemClick }: EventCalendarProps) {
  const controller = useCalendarController();

  // Эффект, а не обработчик: команда должна уйти после того, как календарь
  // смонтирован и привязал к контроллеру своё API. Дочерние эффекты
  // выполняются раньше родительских — к этой строке он уже готов.
  useEffect(() => {
    controller.changeView(FC_VIEWS[view]);
    controller.gotoDate(anchor);
  }, [controller, view, anchor]);

  return (
    <FullCalendar
        controller={controller}
        plugins={PLUGINS}
        locale={ruLocale}
        initialView={FC_VIEWS[view]}
        initialDate={anchor}
        headerToolbar={false}
        // Во всю высоту, без прокрутки внутри: сутки в неделе и дне —
        // 48 получасов по 17 px, чуть больше экрана ноутбука, и вторая
        // полоса прокрутки внутри страницы мешала бы больше, чем помогала.
        height="auto"
        events={items.map((item) => ({ ...item }))}
        // Событие — кнопка: фокус с клавиатуры, Enter открывает его,
        // как клик. Без этого события без адреса достижимы только мышью.
        eventInteractive
        eventClick={(info) => {
          info.jsEvent.preventDefault();
          onItemClick(Number(info.event.id));
        }}
        eventTimeFormat={TIME_FORMAT}
        slotHeaderFormat={TIME_FORMAT}
        dayMaxEvents
        nowIndicator
        noEventsText="В этом месяце событий нет"
      />
  );
}
