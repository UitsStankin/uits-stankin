import { Link } from 'react-router';
import { isApiError } from '@shared/api';
import { ADMIN_GRADESHEETS_ROUTE } from '@shared/config/routes';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import type { useGradesheet } from '../model/useGradesheets';
import { linkClass, LoadStatus } from './common';

export function GradesheetDetail({ state }: { state: ReturnType<typeof useGradesheet> }) {
  const { query, id, removal } = state;
  const sheet = query.data;
  const missing = id === null || (isApiError(query.error) && query.error.status === 404);
  return (
    <section className="grid min-w-0 gap-4">
      <Link className={linkClass} to={ADMIN_GRADESHEETS_ROUTE}>К ведомостям</Link>
      {missing ? <h1 className="text-3xl font-bold">Ведомость не найдена</h1> : (
        <LoadStatus pending={query.isPending} error={query.error} retry={query.refetch} />
      )}
      {sheet && !missing && (
        <>
          <header className="grid gap-1">
            <h1 className="text-3xl font-bold">{sheet.discipline}</h1>
            <p>{sheet.group} · {sheet.semester}</p>
            {sheet.department && <p>Кафедра: {sheet.department}</p>}
            {sheet.direction && <p>Направление: {sheet.direction}</p>}
            {sheet.teachers && <p>Преподаватели: {sheet.teachers}</p>}
            <p>Исходный файл: {sheet.importedFileName}</p>
          </header>
          {sheet.students.length === 0 ? <p>В ведомости нет студентов.</p> : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Таблица оценок">
              <table className="w-full border-collapse bg-white text-left">
                <thead>
                  <tr>
                    <th scope="col" className="border border-default p-2">№</th>
                    <th scope="col" className="border border-default p-2">Студент</th>
                    {sheet.blocks.map((block) => <th key={block} scope="col" className="border border-default p-2">{block}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {sheet.students.map((student) => {
                    return (
                      <tr key={student.id}>
                        <td className="border border-default p-2">{student.number ?? '—'}</td>
                        <th scope="row" className="border border-default p-2 font-medium">
                          {[student.lastName, student.firstName, student.patronymic].filter(Boolean).join(' ')}
                        </th>
                        {sheet.blocks.map((block) => {
                          const marks = student.marks.filter((mark) => mark.block === block);
                          return <td key={block} className="border border-default p-2 align-top">
                            {marks.map((mark) => (
                              <div key={mark.id}>
                                {[mark.score ?? mark.text, mark.grade, mark.date, mark.teacher]
                                  .filter((value) => value !== null).join(' · ')}
                              </div>
                            ))}
                            {marks.length === 0 && '—'}
                          </td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <button type="button" className="w-fit rounded border border-red-700 px-4 py-2 text-red-700"
            onClick={state.ask}>Удалить ведомость</button>
          {removal.error && <p role="alert">{removal.error.message}</p>}
          {state.confirming && (
            <ConfirmDialog title="Удалить ведомость?"
              description={`«${sheet.discipline}», ${sheet.group}, ${sheet.semester}. Вместе с ведомостью будут удалены список студентов и оценки из этой ведомости.`}
              confirmLabel="Удалить" isPending={removal.isPending} onConfirm={state.confirm} onCancel={state.cancel} />
          )}
        </>
      )}
    </section>
  );
}
