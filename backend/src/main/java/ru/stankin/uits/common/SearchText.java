package ru.stankin.uits.common;

public final class SearchText {

    private SearchText() {
    }

    public static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    public static String escapeLike(String value) {
        return value == null
                ? null
                : value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
