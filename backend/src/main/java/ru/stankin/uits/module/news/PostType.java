package ru.stankin.uits.module.news;

import java.util.Set;

public class PostType {
    public static final String PATTERN = "news|announcements";
    public static final Set<String> ALLOWED = Set.of("news", "announcements");

    private PostType() {}
}
