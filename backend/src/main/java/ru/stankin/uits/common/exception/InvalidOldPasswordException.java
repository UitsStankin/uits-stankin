package ru.stankin.uits.common.exception;

public class InvalidOldPasswordException extends RuntimeException {
    public InvalidOldPasswordException(String message) {
        super(message);
    }
}
