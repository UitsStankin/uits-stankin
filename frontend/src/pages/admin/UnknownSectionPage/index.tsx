import { ADMIN_ROUTE } from '@shared/config/routes';
import { ActionLink } from '@shared/ui/StatusAction';
import StatusBlock from '@shared/ui/StatusBlock';

export default function UnknownSectionPage() {
  return (
    <div className="flex flex-col gap-gutter">
      <h1 className="text-h4 text-text-heading">Раздел не найден</h1>

      <StatusBlock
        title="Такого раздела нет"
        description="Проверьте адрес: возможно, ссылка устарела или в ней опечатка."
        action={<ActionLink to={ADMIN_ROUTE}>Ко всем разделам</ActionLink>}
      />
    </div>
  );
}
