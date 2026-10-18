import { queryOptions } from '@tanstack/react-query';

import { fetchExamSummary, fetchScheduleSummary } from './scheduleApi';

export const scheduleKeys = {
  all: ['schedule'] as const,
  summary: () => [...scheduleKeys.all, 'summary'] as const,
  examSummary: () => [...scheduleKeys.all, 'exam-summary'] as const,
};

export const scheduleSummaryQuery = () =>
  queryOptions({
    queryKey: scheduleKeys.summary(),
    queryFn: ({ signal }) => fetchScheduleSummary(signal),
  });

export const examSummaryQuery = () =>
  queryOptions({
    queryKey: scheduleKeys.examSummary(),
    queryFn: ({ signal }) => fetchExamSummary(signal),
  });
