import { useGradesheet, useGradesheets } from './model/useGradesheets';
import { GradesheetDetail } from './ui/GradesheetDetail';
import { GradesheetList } from './ui/GradesheetList';

export default function GradesheetsPage() {
  return <GradesheetList state={useGradesheets()} />;
}

export function GradesheetPage() {
  return <GradesheetDetail state={useGradesheet()} />;
}
