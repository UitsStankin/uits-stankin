import { useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scholarQuery } from '@entities/publication';

export function useScholar() {
  const [{ q, page }, setSearch] = useState({ q: '', page: 0 });
  const [inputError, setInputError] = useState('');
  const results = useQuery(scholarQuery(q, page));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get('q') ?? '');
    const normalized = name.trim().replace(/\s+/g, ' ');
    if (!normalized || /\p{Cc}/u.test(name)) {
      setInputError('Введите имя автора без управляющих символов.');
      return;
    }
    setInputError('');
    if (q === normalized && page === 0 && results.isError) void results.refetch();
    else setSearch({ q: normalized, page: 0 });
  }

  return { q, page, inputError, results, submit, setPage: (next: number) => setSearch({ q, page: next }) };
}
