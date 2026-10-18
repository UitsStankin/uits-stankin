import { useState } from 'react';

import { scrollToId } from '@shared/lib/smoothScroll';

import type { ProgramKey } from './lib/programs';
import { useHomeContent } from './model/useHomeContent';
import { ContactsBlock } from './ui/ContactsBlock';
import { EventsSlider } from './ui/EventsSlider';
import { Hero } from './ui/Hero';
import { HomeBlock } from './ui/HomeBlock';
import { NewsTimeline } from './ui/NewsTimeline';
import { PeopleList } from './ui/PeopleList';
import { ProgramsBlock } from './ui/ProgramsBlock';
import { PromoSlider } from './ui/PromoSlider';
import { ScheduleBand } from './ui/ScheduleBand';
import { StatsBento } from './ui/StatsBento';

/**
 * Титульная страница портала. Сборка: состояние из модели, разметка
 * из чистых компонентов, страница только соединяет одно с другим.
 *
 * Порядок разделов: первый экран с поиском расписания, «главное сейчас»,
 * расписание, уровни обучения, новости, мероприятия, преподаватели, цифры,
 * контакты. Сначала то, за чем приходят (расписание, обучение), потом что
 * нового, в конце сама кафедра. Оба редактируемых блока (`home-before`,
 * `home-after`) остаются: первый — сразу под первым экраном, второй — перед
 * контактами.
 *
 * Два состояния живут здесь, потому что их делят соседи: запрос расписания
 * (форма на первом экране заполняет поле в блоке расписания) и выбранный
 * уровень обучения (ссылки первого экрана переключают вкладки ниже).
 *
 * **На чистой базе оба блока пусты**, и страница обходится без них. Запасного
 * текста «на случай пустоты» здесь нет намеренно: он стал бы вторым
 * источником правды — модератор открыл бы форму правки, увидел пустое поле
 * и текст на экране, которого в форме нет.
 *
 * Единственный `h1` страницы — заголовок первого экрана. Раньше он приходил
 * из `home-before`, но заголовок страницы, который можно стереть правкой
 * блока, — слишком хрупкая опора.
 */
export default function HomePage() {
  const content = useHomeContent();
  const [scheduleQuery, setScheduleQuery] = useState('');
  const [program, setProgram] = useState<ProgramKey>('bac');

  const latestAnnouncement = content.announcements.items[0];

  return (
    <>
      <Hero
        announcement={latestAnnouncement}
        onSearch={(query) => {
          setScheduleQuery(query);
          scrollToId('schedule');
        }}
        onPickProgram={setProgram}
      />

      <HomeBlock text={content.before} />

      <PromoSlider
        conference={content.conferences.items[0]}
        achievement={content.achievements.items[0]}
        announcement={latestAnnouncement}
      />

      <ScheduleBand
        schedules={content.schedules}
        exams={content.exams}
        query={scheduleQuery}
        onQueryChange={setScheduleQuery}
      />

      <ProgramsBlock value={program} onChange={setProgram} />

      <NewsTimeline
        news={content.news}
        announcements={content.announcements}
        hrefForItem={content.hrefForItem}
      />

      <EventsSlider conferences={content.conferences} achievements={content.achievements} />

      <PeopleList teachers={content.teachers} />

      <StatsBento
        schedules={content.schedules}
        exams={content.exams}
        teachers={content.teachers}
        news={content.news}
        announcements={content.announcements}
        conferences={content.conferences}
        achievements={content.achievements}
      />

      <HomeBlock text={content.after} />

      <ContactsBlock text={content.contacts} />
    </>
  );
}
