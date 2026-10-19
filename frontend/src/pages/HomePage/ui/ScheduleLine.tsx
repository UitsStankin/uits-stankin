import type { FoundLesson } from '@entities/schedule';

export function ScheduleLine({ lesson }: { lesson: FoundLesson }) {
  const first = lesson.dates[0];
  const where = [lesson.subgroup && `подгр. ${lesson.subgroup}`, lesson.cabinet && `ауд. ${lesson.cabinet}`]
    .filter(Boolean)
    .join(' · ');
  const range = first ? (first.endDate ? `${first.startDate}–${first.endDate}` : first.startDate) : null;

  return (
    <div className="u-sheet-line">
      {where}
      {where && range && ' · '}
      {range && (
        <span className="u-sheet-range">
          {range}
          {first?.alternativelyPeriod && (
            <>
              {' '}
              <abbr title="через неделю">ч. н.</abbr>
            </>
          )}
        </span>
      )}
    </div>
  );
}
