package ru.stankin.uits.module.schedule.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.client.ParsingServiceClient;
import ru.stankin.uits.module.schedule.dto.ParsedExamsDto;
import ru.stankin.uits.module.schedule.dto.ParsedScheduleDto;
import tools.jackson.databind.json.JsonMapper;

@Component
public class ScheduleServiceClient {

    private final ParsingServiceClient client;

    public ScheduleServiceClient(RestClient scheduleServiceRestClient, JsonMapper jsonMapper) {
        this.client = new ParsingServiceClient(scheduleServiceRestClient, jsonMapper, "расписания");
    }

    public ParsedScheduleDto parse(byte[] pdf, String filename) {
        return client.parse("/parse", pdf, filename, ParsedScheduleDto.class);
    }

    public ParsedExamsDto parseExams(byte[] pdf, String filename) {
        return client.parse("/parse-exams", pdf, filename, ParsedExamsDto.class);
    }
}
