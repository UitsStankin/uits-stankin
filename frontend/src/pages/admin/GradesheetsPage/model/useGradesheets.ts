import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useSearchParams } from 'react-router';
import {
  deleteGradesheet, gradesheetFilters, gradesheetKey, gradesheetQuery, gradesheetsQuery, importGradesheets,
} from '@entities/gradesheet';
import { isApiError } from '@shared/api';
import { ADMIN_GRADESHEETS_ROUTE } from '@shared/config/routes';
import { pageHref, parseId, parsePage } from '@shared/lib';

export function useGradesheets() {
  const [params, setParams] = useSearchParams();
  const page = parsePage(params.get('page'));
  const filters = Object.fromEntries(Object.keys(gradesheetFilters).flatMap((name) => {
    const value = params.get(name)?.trim();
    return value ? [[name, value]] : [];
  }));
  const query = useQuery(gradesheetsQuery(page - 1, filters));
  const client = useQueryClient();
  const [fileError, setFileError] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const upload = useMutation({
    mutationFn: importGradesheets,
    onSuccess: () => client.invalidateQueries({ queryKey: gradesheetKey }),
    onSettled: () => setFile(null),
  });

  function selectFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = event.currentTarget.elements.namedItem('file');
    const selected = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    upload.reset();
    if (!(selected instanceof File) || !selected.size || !/\.xlsx$/i.test(selected.name)) {
      setFileError('Выберите непустую книгу Excel в формате .xlsx.');
    } else if (selected.size > 5 * 1024 * 1024) {
      setFileError('Размер книги не должен превышать 5 МБ.');
    } else {
      setFileError('');
      setFile(selected);
    }
  }

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    for (const name of Object.keys(gradesheetFilters)) {
      const value = String(data.get(name) ?? '').trim();
      if (value) next.set(name, value);
    }
    setParams(next);
  }

  return {
    query, page, filters, applyFilters,
    hrefForPage: (number: number) => pageHref(ADMIN_GRADESHEETS_ROUTE, number, filters),
    upload, file, uploadError: fileError || importErrorMessage(upload.error), selectFile,
    confirmUpload: () => { if (file) upload.mutate(file); },
    cancelUpload: () => setFile(null),
  };
}

export function useGradesheet() {
  const id = parseId(useParams().id);
  const navigate = useNavigate();
  const client = useQueryClient();
  const query = useQuery(gradesheetQuery(id));
  const [confirming, setConfirming] = useState(false);
  const removal = useMutation({
    mutationFn: deleteGradesheet,
    onSuccess: () => {
      void navigate(ADMIN_GRADESHEETS_ROUTE, { replace: true });
      void client.invalidateQueries({ queryKey: [...gradesheetKey, 'list'] });
    },
    onSettled: () => setConfirming(false),
  });

  return {
    id, query, confirming, removal,
    ask: () => { removal.reset(); setConfirming(true); },
    cancel: () => setConfirming(false),
    confirm: () => { if (id !== null) removal.mutate(id); },
  };
}

function importErrorMessage(error: Error | null): string {
  if (!isApiError(error)) return error?.message ?? '';
  switch (error.status) {
    case 0:
      return 'Связь с сервером прервалась. Проверьте список ведомостей перед повторным импортом.';
    case 413:
      return 'Размер книги не должен превышать 5 МБ.';
    case 503:
      return 'Сервис разбора ведомостей недоступен. Повторите импорт позже.';
    default:
      return error.message;
  }
}
