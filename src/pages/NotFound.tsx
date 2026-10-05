import { House, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl pt-10">
      <EmptyState
        icon={SearchX}
        title="Сторінку не знайдено"
        description="Можливо, запис було видалено або посилання застаріло."
        action={
          <ButtonLink to="/" icon={House}>
            На головну
          </ButtonLink>
        }
      />
    </div>
  );
}
