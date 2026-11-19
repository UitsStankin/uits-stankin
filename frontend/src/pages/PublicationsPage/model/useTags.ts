import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteTag, publicationsKey, saveTag, tagsQuery, type Tag } from '@entities/publication';

export function useTags() {
  const tags = useQuery(tagsQuery);
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);
  const invalidate = () => cache.invalidateQueries({ queryKey: publicationsKey });
  const save = useMutation({
    mutationFn: ({ id, name }: { id: number | null; name: string }) => saveTag(id, name),
    onSuccess: async () => {
      await invalidate();
      setEditing(null);
    },
  });
  const remove = useMutation({
    mutationFn: deleteTag,
    onSuccess: async (_, id) => {
      await invalidate();
      setEditing((tag) => tag?.id === id ? null : tag);
      setConfirmDelete(null);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get('name') ?? '').trim();
    if (name && !save.isPending && !remove.isPending) {
      save.mutate({ id: editing?.id ?? null, name }, { onSuccess: () => form.reset() });
    }
  }

  function edit(tag: Tag | null) {
    save.reset();
    setConfirmDelete(null);
    setEditing(tag);
  }

  function confirm(tag: Tag | null) {
    remove.reset();
    setConfirmDelete(tag);
  }

  return { tags, editing, confirmDelete, save, remove, submit, edit, confirm };
}
