package ru.stankin.uits.common;

import org.springframework.data.domain.Sort;
import ru.stankin.uits.common.exception.InvalidRequestException;

import java.util.Set;

public final class SortFields {

    private SortFields() {
    }

    public static void validate(Sort sort, Set<String> allowed) {
        for (Sort.Order order : sort) {
            if (!allowed.contains(order.getProperty())) {
                throw new InvalidRequestException("Неизвестное поле сортировки: " + order.getProperty());
            }
        }
    }
}
