package ru.stankin.uits.module.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedLessonDateDto {
    String start;
    String end;

    @JsonProperty("every_other_week")
    Boolean everyOtherWeek;
}
