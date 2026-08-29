import { useHomeContent } from './model/useHomeContent';
import { HomeBlock } from './ui/HomeBlock';
import { HomeNews } from './ui/HomeNews';

/**
 * Титульная страница портала. Сборка: состояние из модели, разметка
 * из чистых компонентов, страница только соединяет одно с другим.
 *
 * Три куска, как в оригинале контракта: редактируемый блок над лентой,
 * лента, редактируемый блок под ней. Оба блока — те же редактируемые
 * разделы, что в F-23, только собственного адреса у них нет.
 *
 * **На чистой базе оба блока пусты**, и главная состоит из одной ленты.
 * Это дырка в данных, а не в вёрстке: ченджсет `008-seed-editable-pages`
 * заводит все тринадцать разделов с пустым текстом, а в старом портале
 * `home-before` и `home-after` были объявлены в `DEFAULT_EDITABLE_PAGES`
 * и не использовались нигде — главная там была свёрстана руками.
 * Содержимое старой главной, переложенное в Markdown, лежит в
 * FRONTEND_BACKLOG рядом с F-17 и ждёт заявки бэкендеру на сид.
 *
 * Запасного текста «на случай пустоты» здесь нет намеренно: он стал бы
 * вторым источником правды — модератор открыл бы форму правки, увидел
 * пустое поле и текст на экране, которого в форме нет.
 *
 * Ширина шире, чем у ленты (`max-w-5xl` против `max-w-4xl`): на главной
 * под карточками новостей лежит ещё и текст блоков, и колонка, комфортная
 * для одной ленты, для витрины узка.
 */
export default function HomePage() {
  const { before, after, news, hrefForItem } = useHomeContent();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-gutter">
      <HomeBlock text={before} />

      <HomeNews
        items={news.items}
        hrefForItem={hrefForItem}
        isLoading={news.isLoading}
        isOffline={news.isOffline}
        isError={news.isError}
        errorMessage={news.errorMessage}
        isEmpty={news.isEmpty}
        onRetry={news.refetch}
      />

      <HomeBlock text={after} />
    </div>
  );
}
