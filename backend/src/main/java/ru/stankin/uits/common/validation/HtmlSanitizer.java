package ru.stankin.uits.common.validation;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * Чистка пользовательского HTML: разрешена разметка форматирования, ссылки
 * и картинки, вырезаются скрипты, обработчики событий и прочий исполняемый код.
 *
 * <p>Правила одни и те же для всех rich-text полей и для их валидации: проверка,
 * чистящая иначе, чем сохранение, разрешает не то, что уедет в базу.
 */
public final class HtmlSanitizer {

    private HtmlSanitizer() {
    }

    public static String sanitize(String html) {
        if (html == null) {
            return null;
        }

        return Jsoup.clean(html, Safelist.relaxed().preserveRelativeLinks(true));
    }
}
