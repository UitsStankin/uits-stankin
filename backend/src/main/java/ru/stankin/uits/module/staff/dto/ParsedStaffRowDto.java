package ru.stankin.uits.module.staff.dto;

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
public class ParsedStaffRowDto {

    @JsonProperty("row_number")
    Integer rowNumber;

    String category;

    @JsonProperty("last_name")
    String lastName;

    @JsonProperty("first_name")
    String firstName;

    String patronymic;
    String position;
    String degree;
    String rank;
    String email;

    @JsonProperty("phone_number")
    String phoneNumber;

    String messenger;
    Integer experience;

    @JsonProperty("professional_experience")
    Integer professionalExperience;

    String education;
    String qualification;
    String bio;

    @JsonProperty("parse_errors")
    List<String> parseErrors;
}
