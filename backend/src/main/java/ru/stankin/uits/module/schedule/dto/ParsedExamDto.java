package ru.stankin.uits.module.schedule.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParsedExamDto {

    String date;

    @JsonProperty("week_day")
    Integer weekDay;

    @JsonProperty("time_start")
    String timeStart;

    @JsonProperty("time_end")
    String timeEnd;

    String group;
    String name;
    String cabinet;
    ParsedConsultationDto consultation;
}
