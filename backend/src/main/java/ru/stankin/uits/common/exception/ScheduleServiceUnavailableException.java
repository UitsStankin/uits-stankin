package ru.stankin.uits.common.exception;

public class ScheduleServiceUnavailableException extends RuntimeException {
    public ScheduleServiceUnavailableException(String message) {
        super(message);
    }

    public ScheduleServiceUnavailableException(String message, Throwable cause) {
        super(message, cause);
    }
}
