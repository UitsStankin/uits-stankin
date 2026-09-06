package ru.stankin.uits.module.gradesheets.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.client.ParsingServiceClient;
import ru.stankin.uits.module.gradesheets.dto.ParsedGradeSheetsDto;
import tools.jackson.databind.json.JsonMapper;

@Component
public class GradeSheetParseClient {

    private final ParsingServiceClient client;

    public GradeSheetParseClient(RestClient scheduleServiceRestClient, JsonMapper jsonMapper) {
        this.client = new ParsingServiceClient(scheduleServiceRestClient, jsonMapper, "ведомости");
    }

    public ParsedGradeSheetsDto parse(byte[] workbook, String filename) {
        return client.parse("/parse-gradesheet", workbook, filename, ParsedGradeSheetsDto.class);
    }
}
