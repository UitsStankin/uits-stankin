package ru.stankin.uits.module.events.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.stankin.uits.module.events.enums.EventStatus;
import ru.stankin.uits.module.events.enums.NotificationFrequency;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserEventRequestDto {
    @NotBlank(message = "Название обязательно")
    @Size(max = 200, message = "Название не длиннее 200 символов")
    String name;

    String description;

    @NotNull(message = "Дата начала обязательна")
    OffsetDateTime startedAt;

    @NotNull(message = "Дата окончания обязательна")
    OffsetDateTime endedAt;

    @NotNull(message = "Признак «весь день» обязателен")
    Boolean allDay;

    @NotBlank(message = "Цвет обязателен")
    @Pattern(regexp = "^#[0-9a-fA-F]{6}$",
            message = "Цвет — решётка и шесть шестнадцатеричных цифр, например #3F51B5")
    String color;

    @NotNull(message = "Статус обязателен")
    EventStatus status;

    @NotNull(message = "Частота напоминаний обязательна")
    NotificationFrequency notificationFrequency;

    List<Long> assignedUserIds;
}
