import { queryOptions } from '@tanstack/react-query';
import { api } from '@shared/api';
import type { Page } from '@shared/types';

export interface GradesheetSummary {
  id: number;
  discipline: string;
  group: string;
  semester: string;
  department: string | null;
  direction: string | null;
  teachers: string | null;
  studentCount: number;
  importedFileName: string;
}

export interface GradesheetMark {
  id: number;
  block: string;
  score: number | null;
  text: string | null;
  grade: string | null;
  date: string | null;
  teacher: string | null;
}

export interface Gradesheet extends Omit<GradesheetSummary, 'studentCount'> {
  blocks: string[];
  students: {
    id: number;
    number: number | null;
    lastName: string;
    firstName: string;
    patronymic: string | null;
    marks: GradesheetMark[];
  }[];
}

export type ImportedSheet = Pick<GradesheetSummary, 'id' | 'discipline' | 'group' | 'semester' | 'studentCount'> & {
  sheetName: string;
  warnings: string[];
};

export const gradesheetFilters = {
  discipline: 'Дисциплина',
  group: 'Группа',
  semester: 'Семестр',
};

export const gradesheetKey = ['gradesheets'] as const;

export function gradesheetsQuery(page: number, filters: Record<string, string>) {
  return queryOptions({
    queryKey: [...gradesheetKey, 'list', page, filters],
    queryFn: async ({ signal }) => (await api.get<Page<GradesheetSummary>>('/api/gradesheets', {
      params: { ...filters, page }, signal,
    })).data,
  });
}

export function gradesheetQuery(id: number | null) {
  return queryOptions({
    queryKey: [...gradesheetKey, 'detail', id],
    enabled: id !== null,
    gcTime: 0,
    queryFn: async ({ signal }) => (await api.get<Gradesheet>(`/api/gradesheets/${id}`, { signal })).data,
  });
}

export async function importGradesheets(file: File) {
  const body = new FormData();
  body.append('file', file);
  return (await api.post<{ sheets: ImportedSheet[] }>('/api/gradesheets/import', body)).data;
}

export async function deleteGradesheet(id: number) {
  await api.delete(`/api/gradesheets/${id}`);
}
