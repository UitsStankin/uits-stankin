import type { Publication } from '@entities/publication';
import type { usePublicationEditor } from '../model/usePublication';
import { buttonClass, inputClass, linkClass, MutationError, panelClass, QueryStatus } from './common';

export type Draft = Partial<Pick<Publication, 'name' | 'url' | 'year'>>;

const optionalFields = [
  { name: 'url', label: 'Ссылка на публикацию', max: 200 },
  { name: 'pages', label: 'Страницы', max: 50 },
  { name: 'volN', label: 'Том и номер', max: 100 },
  { name: 'isbn', label: 'ISBN', max: 20 },
] as const;

export function PublicationForm({ item, draft, state }: {
  item?: Publication;
  draft: Draft;
  state: ReturnType<typeof usePublicationEditor>;
}) {
  const { tags, save, remove, submit, confirmDelete, setConfirmDelete } = state;
  const busy = save.isPending || remove.isPending;
  return (
    <>
      <form className={panelClass} onSubmit={submit}>
        <fieldset disabled={busy} className="grid gap-4">
          <label>Название
            <input className={inputClass} name="name" maxLength={200} required defaultValue={item?.name ?? draft.name} />
          </label>
          <label>Авторы (по одному на строку)
            <textarea className={inputClass} name="authors" required rows={3} defaultValue={item?.authors.join('\n')} />
          </label>
          <label>Описание
            <textarea className={inputClass} name="description" required rows={5} defaultValue={item?.description} />
          </label>
          <label>Источник
            <input className={inputClass} name="source" maxLength={200} required defaultValue={item?.source} />
          </label>
          <label>Год
            <input className={inputClass} name="year" type="number" min={1900}
              max={new Date().getFullYear() + 1} required defaultValue={item?.year ?? draft.year ?? undefined} />
          </label>
          {optionalFields.map(({ name, label, max }) => (
            <label key={name}>{label}
              <input className={inputClass} name={name} maxLength={max}
                defaultValue={item?.[name] ?? (name === 'url' ? draft.url ?? undefined : undefined)} />
            </label>
          ))}
          <label>PDF (до 15 МБ)
            <input name="pdf" type="file" accept=".pdf,application/pdf" className="block w-full" />
          </label>
          {item?.file && (
            <div className="grid gap-2">
              {item.fileUrl && <a className={linkClass} href={item.fileUrl}>Текущий PDF</a>}
              <label className="flex gap-2"><input type="checkbox" name="removeFile" /> Убрать текущий PDF</label>
            </div>
          )}
          <fieldset className="grid gap-2">
            <legend className="font-semibold">Теги</legend>
            <QueryStatus pending={tags.isPending} error={tags.error} retry={tags.refetch} />
            {tags.data?.length === 0 && <p>Тегов пока нет.</p>}
            {tags.data?.map((tag) => (
              <label key={tag.id} className="flex gap-2">
                <input type="checkbox" name="tagIds" value={tag.id}
                  defaultChecked={item?.tags.some(({ id }) => id === tag.id)} />
                {tag.name}
              </label>
            ))}
          </fieldset>
          <MutationError error={save.error} />
          <button className={buttonClass} disabled={!tags.data}>{save.isPending ? 'Сохранение…' : 'Сохранить'}</button>
        </fieldset>
      </form>
      {item && (
        <div className={`${panelClass} grid gap-3`}>
          <MutationError error={remove.error} />
          {confirmDelete ? (
            <>
              <p>Удалить публикацию «{item.name}»?</p>
              <div className="flex gap-4">
                <button className={buttonClass} disabled={busy} onClick={() => remove.mutate(item.id)}>Удалить</button>
                <button className={linkClass} disabled={busy} onClick={() => setConfirmDelete(false)}>Отмена</button>
              </div>
            </>
          ) : <button className={linkClass + ' w-fit'} disabled={busy} onClick={() => setConfirmDelete(true)}>Удалить публикацию</button>}
        </div>
      )}
    </>
  );
}
