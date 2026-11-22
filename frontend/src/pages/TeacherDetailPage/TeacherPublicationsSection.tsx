import { useTeacherPublications } from './model/useTeacherPublications';
import { TeacherPublications } from './ui/TeacherPublications';

export function TeacherPublicationsSection({ teacher, standalone }: {
  teacher: Parameters<typeof useTeacherPublications>[0];
  standalone: boolean;
}) {
  const state = useTeacherPublications(teacher, standalone);
  return <TeacherPublications state={state} standalone={standalone} />;
}
