import type { useTags } from '../model/useTags';
import { buttonClass, CatalogLink, inputClass, linkClass, MutationError, panelClass, QueryStatus } from './common';

export function Tags({ state }: { state: ReturnType<typeof useTags> }) {
  const { tags, editing, name, setName, confirmDelete, save, remove, submit, edit, confirm } = state;
  const busy = save.isPending || remove.isPending;
  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <CatalogLink />
      <h1 className="text-3xl font-bold">Управление тегами</h1>
      <form key={editing?.id ?? 'new'} className={`${panelClass} grid gap-3`} onSubmit={submit}>
        <label>{editing ? 'Новое название тега' : 'Название нового тега'}
          <input className={inputClass} name="name" required maxLength={100} value={name}
            disabled={busy} onChange={(event) => setName(event.target.value)} />
        </label>
        <MutationError error={save.error} />
        <div className="flex gap-4">
          <button className={buttonClass} disabled={busy}>{editing ? 'Сохранить' : 'Добавить тег'}</button>
          {editing && <button type="button" className={linkClass} onClick={() => edit(null)} disabled={busy}>Отмена</button>}
        </div>
      </form>
      <QueryStatus pending={tags.isPending} error={tags.error} retry={tags.refetch} />
      {tags.data?.length === 0 && <p>Тегов пока нет.</p>}
      <ul className="grid gap-3">
        {tags.data?.map((tag) => (
          <li key={tag.id} className={`${panelClass} grid gap-2`}>
            <p className="font-semibold">{tag.name}</p>
            {confirmDelete?.id === tag.id ? (
              <>
                <p>Удалить тег «{tag.name}» из справочника и всех публикаций?</p>
                <MutationError error={remove.error} />
                <div className="flex gap-4">
                  <button className={buttonClass} disabled={busy} onClick={() => remove.mutate(tag.id)}>Удалить</button>
                  <button className={linkClass} disabled={busy} onClick={() => confirm(null)}>Отмена</button>
                </div>
              </>
            ) : (
              <div className="flex gap-4">
                <button className={linkClass} disabled={busy} onClick={() => edit(tag)}>Переименовать</button>
                <button className={linkClass} disabled={busy} onClick={() => confirm(tag)}>Удалить тег</button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
