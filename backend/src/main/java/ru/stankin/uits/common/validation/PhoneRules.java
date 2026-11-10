package ru.stankin.uits.common.validation;

public final class PhoneRules {

    public static final String REGEXP = "^[\\p{L}\\p{N}+()\\-.,;:#/ ]*$";
    public static final String MESSAGE = "Телефон содержит недопустимые символы";

    private PhoneRules() {
    }
}
