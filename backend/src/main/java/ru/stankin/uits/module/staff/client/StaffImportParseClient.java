package ru.stankin.uits.module.staff.client;

import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ru.stankin.uits.common.client.ParsingServiceClient;
import ru.stankin.uits.module.staff.dto.ParsedStaffFileDto;
import tools.jackson.databind.json.JsonMapper;

@Component
public class StaffImportParseClient {

    private final ParsingServiceClient client;

    public StaffImportParseClient(RestClient scheduleServiceRestClient, JsonMapper jsonMapper) {
        this.client = new ParsingServiceClient(scheduleServiceRestClient, jsonMapper, "списка сотрудников");
    }

    public ParsedStaffFileDto parse(byte[] fileBytes, String filename) {
        return client.parse("/parse-staff", fileBytes, filename, ParsedStaffFileDto.class);
    }
}
