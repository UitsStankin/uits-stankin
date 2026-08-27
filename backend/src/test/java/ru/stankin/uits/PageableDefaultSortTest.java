package ru.stankin.uits;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.config.BeanDefinition;
import org.springframework.context.annotation.ClassPathScanningCandidateComponentProvider;
import org.springframework.core.type.filter.AnnotationTypeFilter;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.RestController;

import java.lang.reflect.Method;
import java.lang.reflect.Parameter;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Сортировка страницы обязана заканчиваться уникальным полем.
 *
 * <p>Порядок строк с одинаковым значением ключа сортировки Postgres не гарантирует и
 * вправе выдать его по-разному на каждый запрос. При постраничном выводе это значит,
 * что одна запись приходит на двух страницах, а другая не приходит ни на одной.
 * Интеграционный тест такое не ловит: на нескольких строках план стабилен, и порядок
 * случайно оказывается верным. Поэтому правило проверяется по самой сортировке.
 */
class PageableDefaultSortTest {

    /** Поля с уникальным значением: годятся последним ключом сортировки. */
    private static final Set<String> UNIQUE_FIELDS = Set.of("id", "name");

    @Test
    void everyPageableDefaultEndsWithUniqueField() {
        List<String> violations = new ArrayList<>();

        for (Class<?> controller : controllers()) {
            for (Method method : controller.getDeclaredMethods()) {
                for (Parameter parameter : method.getParameters()) {
                    PageableDefault annotation = parameter.getAnnotation(PageableDefault.class);

                    if (annotation == null) {
                        continue;
                    }

                    String[] sort = annotation.sort();

                    if (sort.length == 0 || !UNIQUE_FIELDS.contains(sort[sort.length - 1])) {
                        violations.add(controller.getSimpleName() + "." + method.getName()
                                + " сортирует по " + String.join(", ", sort));
                    }
                }
            }
        }

        assertThat(violations)
                .as("последний ключ сортировки обязан быть уникальным полем %s, "
                        + "иначе порядок строк с одинаковым значением не определён "
                        + "и страницы теряют и дублируют записи", UNIQUE_FIELDS)
                .isEmpty();
    }

    private List<Class<?>> controllers() {
        ClassPathScanningCandidateComponentProvider scanner =
                new ClassPathScanningCandidateComponentProvider(false);
        scanner.addIncludeFilter(new AnnotationTypeFilter(RestController.class));

        List<Class<?>> found = new ArrayList<>();

        for (BeanDefinition definition : scanner.findCandidateComponents("ru.stankin.uits")) {
            try {
                found.add(Class.forName(definition.getBeanClassName()));
            } catch (ClassNotFoundException e) {
                throw new IllegalStateException(e);
            }
        }

        assertThat(found).isNotEmpty();

        return found;
    }
}
