package ru.stankin.uits.module.events.dto;

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
public class UserEventResponseDto {
    Long id;
    String name;
    String description;
    OffsetDateTime startedAt;
    OffsetDateTime endedAt;
    Boolean allDay;
    String color;
    EventStatus status;
    NotificationFrequency notificationFrequency;
    OffsetDateTime nextNotificationAt;
    EventUserDto owner;
    List<EventUserDto> assignedUsers;
}
