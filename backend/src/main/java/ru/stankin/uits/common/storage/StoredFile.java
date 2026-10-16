package ru.stankin.uits.common.storage;

import java.time.Instant;

public record StoredFile(String key, Instant lastModified) {
}
