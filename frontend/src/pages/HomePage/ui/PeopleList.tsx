import { Link } from 'react-router';

import { TEACHERS_ROUTE, teacherRoute } from '@shared/config/routes';
import { teacherFullName } from '@entities/teacher';
import type { TeacherListItem } from '@shared/types';

import type { HomeListState } from '../model/useHomeContent';
import { SectionStatus } from './SectionStatus';

interface PeopleListProps {
  teachers: HomeListState<TeacherListItem>;
}

function initials(teacher: TeacherListItem): string {
  return (teacher.firstName.charAt(0) + teacher.lastName.charAt(0)).toUpperCase();
}

/**
 * Витрина преподавателей: карточка с фото, ФИО и должностью — ссылкой
 * на страницу преподавателя. Фото нет — вместо него инициалы на цветной плитке.
 */
export function PeopleList({ teachers }: PeopleListProps) {
  return (
    <section id="people" className="u-people-band" aria-labelledby="h-people">
      <div className="u-wrap u-people-block">
        <div className="u-people-head">
          <h2 id="h-people" className="u-section-title u-small">
            Преподаватели
          </h2>
          <Link className="u-btn-ghost u-nw" to={TEACHERS_ROUTE}>
            Все сотрудники кафедры →
          </Link>
        </div>

        <SectionStatus
          state={teachers}
          loading="Загрузка преподавателей"
          errorTitle="Не удалось загрузить преподавателей"
          emptyTitle="Карточек преподавателей пока нет"
        />

        {teachers.items.length > 0 && (
          <ul className="u-people-grid">
            {teachers.items.map((teacher) => (
              <li key={teacher.id}>
                <Link to={teacherRoute(teacher.id)} className="u-person">
                  <span className="u-person-frame">
                    {teacher.avatarUrl ? (
                      <img
                        className="u-person-photo"
                        src={teacher.avatarUrl}
                        alt=""
                        loading="lazy"
                      />
                    ) : (
                      <span className="u-person-initials" aria-hidden>
                        {initials(teacher)}
                      </span>
                    )}
                  </span>
                  <span className="u-person-name">{teacherFullName(teacher)}</span>
                  <span className="u-person-pos">{teacher.position}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
