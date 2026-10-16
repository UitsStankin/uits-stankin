package ru.stankin.uits.common.exception;

public class ScholarUnavailableException extends RuntimeException {
    public ScholarUnavailableException(String message) {
        super(message);
    }

    public ScholarUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
