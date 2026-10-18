import { BRAND_COLORS } from '@shared/config/brandColors';
import { BrandPattern } from '@shared/ui/brand/BrandPattern';

const HISTORY_PATTERN_SEED = 1988;

export function HistoryHero() {
  return (
    <section className="relative animate-fade-in-up overflow-hidden rounded-lg bg-surface px-6 py-12 shadow-sm md:px-12 md:py-16">
      <BrandPattern
        className="pointer-events-none absolute -right-32 top-1/2 h-[34rem] w-[34rem] -translate-y-1/2 opacity-40"
        seed={HISTORY_PATTERN_SEED}
        colors={BRAND_COLORS}
      />

      <div className="relative max-w-2xl">
        <h1 className="u-page-title">История кафедры</h1>

        {/* Две строки: перенос — часть подписи, а не длина строки. Верхняя
            называет кафедру, нижняя — путь, который ниже разложен по годам. */}
        <p className="mt-4 text-lg leading-normal">
          Кафедра управления и информатики в технических системах
          <br />
          От биотехнической кибернетики к интеллектуальному анализу данных
        </p>
      </div>
    </section>
  );
}
