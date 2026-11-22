import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router';
import { deletePublication, publicationQuery, publicationsKey, savePublication, tagsQuery } from '@entities/publication';
import { uploadFile } from '@shared/api';
import { PUBLICATION_MANAGE_ROUTE, publicationRoute } from '@shared/config/routes';
import { parseId } from '@shared/lib';

export function usePublication() {
  const { id: raw } = useParams();
  const id = parseId(raw);
  const query = useQuery({ ...publicationQuery(id ?? 0), enabled: id !== null });
  return { id, invalid: raw !== undefined && id === null, query };
}

export function usePublicationEditor(id: number | null, currentFile: string | null) {
  const navigate = useNavigate();
  const cache = useQueryClient();
  const tags = useQuery(tagsQuery);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = useMutation({
    mutationFn: async ({ data, pdf }: { data: FormData; pdf?: File }) => {
      const value = (key: string) => String(data.get(key) ?? '').trim();
      const authors = value('authors').split('\n').map((name) => name.trim()).filter(Boolean);
      const name = value('name');
      const source = value('source');
      const description = value('description');
      if (!name || !source || !description) throw new Error('Заполните название, описание и источник.');
      if (!authors.length || authors.some((author) => author.length > 200)) {
        throw new Error('Укажите хотя бы одного автора. Имя автора может содержать до 200 символов.');
      }
      let file = data.has('removeFile') ? null : currentFile;
      if (pdf) {
        if (pdf.size > 15 * 1024 * 1024) throw new Error('Размер PDF не должен превышать 15 МБ.');
        file = (await uploadFile(pdf, 'publications')).key;
      }
      return savePublication(id, {
        name, authors, description, source, file,
        year: Number(value('year')),
        url: value('url') || null,
        pages: value('pages') || null,
        volN: value('volN') || null,
        isbn: value('isbn') || null,
        tagIds: data.getAll('tagIds').map(Number),
      });
    },
    onSuccess: async (item) => {
      await cache.invalidateQueries({ queryKey: publicationsKey });
      navigate(publicationRoute(item.id), { replace: true });
    },
  });
  const remove = useMutation({
    mutationFn: deletePublication,
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: publicationsKey });
      navigate(PUBLICATION_MANAGE_ROUTE, { replace: true });
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.isPending || remove.isPending || !tags.data) return;
    const form = event.currentTarget;
    const control = form.elements.namedItem('pdf');
    const pdf = control instanceof HTMLInputElement ? control.files?.[0] : undefined;
    save.mutate({ data: new FormData(form), pdf });
  }

  return { tags, save, remove, submit, confirmDelete, setConfirmDelete };
}
