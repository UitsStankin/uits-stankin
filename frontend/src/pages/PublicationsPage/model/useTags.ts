import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteTag, publicationsKey, saveTag, tagsQuery, type Tag } from '@entities/publication';
import { useUnsavedChanges } from '@shared/lib';

export function useTags() {
  const tags = useQuery(tagsQuery);
  const cache = useQueryClient();
  const [editing, setEditing] = useState<Tag | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null);
  const [name, setName] = useState('');
  useUnsavedChanges(name !== (editing?.name ?? ''));
  const invalidate = () => cache.invalidateQueries({ queryKey: publicationsKey });
  const save = useMutation({
    mutationFn: ({ id, name }: { id: number | null; name: string }) => saveTag(id, name),
    onSuccess: async () => {
      await invalidate();
      setEditing(null);
      setName('');
    },
  });
  const remove = useMutation({
    mutationFn: deleteTag,
    onSuccess: async (_, id) => {
      await invalidate();
      if (editing?.id === id) {
        setEditing(null);
        setName('');
      }
      setConfirmDelete(null);
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    if (trimmedName && !save.isPending && !remove.isPending) {
      save.mutate({ id: editing?.id ?? null, name: trimmedName });
    }
  }

  function edit(tag: Tag | null) {
    save.reset();
    setConfirmDelete(null);
    setEditing(tag);
    setName(tag?.name ?? '');
  }

  function confirm(tag: Tag | null) {
    remove.reset();
    setConfirmDelete(tag);
  }

  return { tags, editing, name, setName, confirmDelete, save, remove, submit, edit, confirm };
}
