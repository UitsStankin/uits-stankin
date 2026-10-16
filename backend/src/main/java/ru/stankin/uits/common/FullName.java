package ru.stankin.uits.common;

import java.util.stream.Collectors;
import java.util.stream.Stream;

public final class FullName {

    private FullName() {
    }

    public static String of(String lastName, String firstName, String patronymic) {
        return Stream.of(lastName, firstName, patronymic)
                .filter(part -> part != null && !part.isBlank())
                .collect(Collectors.joining(" "));
    }
}
