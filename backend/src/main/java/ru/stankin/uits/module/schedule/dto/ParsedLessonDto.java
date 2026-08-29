package ru.stankin.uits.module.schedule.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedLessonDto {

    @JsonProperty("week_day")
    Integer weekDay;

    @JsonProperty("class_time")
    Integer classTime;

    String group;
    String name;
    String type;
    String subgroup;
    String cabinet;
    List<ParsedLessonDateDto> dates;
}
