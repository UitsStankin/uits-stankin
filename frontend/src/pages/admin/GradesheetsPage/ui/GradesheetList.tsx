import { Link } from 'react-router';
import { gradesheetFilters } from '@entities/gradesheet';
import { ADMIN_GRADESHEETS_ROUTE, adminGradesheetRoute } from '@shared/config/routes';
import ConfirmDialog from '@shared/ui/ConfirmDialog';
import Pagination from '@shared/ui/Pagination';
import type { useGradesheets } from '../model/useGradesheets';
import { buttonClass, inputClass, linkClass, LoadStatus } from './common';

export function GradesheetList({ state }: { state: ReturnType<typeof useGradesheets> }) {
  const { filters, query, page, hrefForPage, upload, file, uploadError } = state;
  return (
    <section className="grid gap-5">
      <h1 className="text-3xl font-bold">Ведомости</h1>
      <form onSubmit={state.selectFile} className="grid gap-3 rounded-lg bg-white p-4">
        <h2 className="text-xl font-semibold">Импорт из Excel</h2>
        <label>Книга Excel (.xlsx, до 5 МБ)
          <input name="file" className={inputClass} type="file" accept=".xlsx" disabled={upload.isPending} />
        </label>
        <button className={`w-fit ${buttonClass}`} disabled={upload.isPending}>Загрузить книгу</button>
        {uploadError && <p role="alert">{uploadError}</p>}
        {upload.data && (
          <div aria-live="polite">
            <p>Импортировано ведомостей: {upload.data.sheets.length}</p>
            <ul className="grid gap-2">
              {upload.data.sheets.map((sheet) => (
                <li key={sheet.id}>
                  Лист «{sheet.sheetName}» · <Link className={linkClass} to={adminGradesheetRoute(sheet.id)}>
                    {sheet.discipline} · {sheet.group} · {sheet.semester}
                  </Link> · Студентов: {sheet.studentCount}
                  {sheet.warnings.length > 0 && (
                    <ul className="list-disc pl-6">
                      {sheet.warnings.map((warning, index) => <li key={index}>{warning}</li>)}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
      {file && (
        <ConfirmDialog title="Импортировать ведомости?"
          description={`Книга «${file.name}» может содержать несколько ведомостей. Повторный импорт для той же дисциплины, группы и семестра заменит состав студентов и оценки.`}
          confirmLabel="Импортировать" pendingLabel="Импортируем…" isPending={upload.isPending}
          onConfirm={state.confirmUpload} onCancel={state.cancelUpload} />
      )}
      <form key={JSON.stringify(filters)} onSubmit={state.applyFilters}
        className="grid gap-3 rounded-lg bg-white p-4 sm:grid-cols-3">
        {Object.entries(gradesheetFilters).map(([name, label]) => (
          <label key={name}>{label}
            <input name={name} className={inputClass} defaultValue={filters[name] ?? ''} />
          </label>
        ))}
        <div className="flex items-center gap-3 sm:col-span-3">
          <button className={buttonClass}>Применить</button>
          <Link className={linkClass} to={ADMIN_GRADESHEETS_ROUTE}>Сбросить</Link>
        </div>
      </form>
      <LoadStatus pending={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && (
        <>
          {query.data.content.length === 0 && (
            <p>{query.data.totalElements ? 'На этой странице нет ведомостей.' : 'Ведомости не найдены.'}</p>
          )}
          <ul className="grid gap-3">
            {query.data.content.map((sheet) => (
              <li key={sheet.id} className="rounded-lg bg-white p-4">
                <h2 className="text-xl font-semibold">
                  <Link className={linkClass} to={adminGradesheetRoute(sheet.id)}>{sheet.discipline} · {sheet.group}</Link>
                </h2>
                <p>{sheet.semester} · Студентов: {sheet.studentCount}</p>
                {sheet.teachers && <p>{sheet.teachers}</p>}
              </li>
            ))}
          </ul>
          {page > query.data.totalPages && query.data.totalElements > 0
            ? <Link className={linkClass} to={hrefForPage(1)}>На первую страницу</Link>
            : <Pagination page={page} totalPages={query.data.totalPages} buildHref={hrefForPage} />}
        </>
      )}
    </section>
  );
}
