package ru.stankin.uits.module.staff;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.TestRole;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeRequestDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeResponseDto;
import ru.stankin.uits.module.staff.entity.HelpersEmployee;
import ru.stankin.uits.module.staff.repository.HelpersEmployeeRepository;

import java.io.IOException;

import static org.assertj.core.api.Assertions.assertThat;

public class HelpersEmployeeIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private HelpersEmployeeRepository helpersEmployeeRepository;

    private HelpersEmployee createHelper(String lastName, String firstName) {
        return helpersEmployeeRepository.save(HelpersEmployee.builder()
                .lastName(lastName)
                .firstName(firstName)
                .position("инженер")
                .build());
    }

    private HttpHeaders authJson(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);

        return headers;
    }

    private String moderatorToken() {
        createUser("moder", TestRole.MODERATOR);

        return login("moder");
    }

    @Test
    void getHelpers_ReturnsPageSortedByLastName() {
        createHelper("Яшина", "Ольга");
        createHelper("Белова", "Ирина");

        ResponseEntity<PageResponseDto<HelpersEmployeeResponseDto>> response = restTemplate.exchange(
                "/api/public/helpers",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<HelpersEmployeeResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.totalElements()).isEqualTo(2);
        assertThat(body.content().getFirst().getLastName()).isEqualTo("Белова");
        assertThat(body.content().getLast().getLastName()).isEqualTo("Яшина");
    }

    @Test
    void createHelper_AsModerator_Returns201WithLocation() {
        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Кузнецова")
                .firstName("Анна")
                .patronymic("Сергеевна")
                .position("инженер кафедры")
                .build();

        ResponseEntity<HelpersEmployeeResponseDto> response = restTemplate.exchange(
                "/api/helpers",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                HelpersEmployeeResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        HelpersEmployeeResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isNotNull();
        assertThat(response.getHeaders().getLocation())
                .isNotNull()
                .hasToString("/api/helpers/" + body.getId());
        assertThat(body.getPatronymic()).isEqualTo("Сергеевна");
    }

    @Test
    void createHelper_WithUnknownAvatarKey_Returns400() {
        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Кузнецова")
                .firstName("Анна")
                .position("инженер")
                .avatar("avatars/nope.jpg")
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/helpers",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    /** Аватар карточки живёт в avatars: ключ существующего файла из чужого раздела не принимается (D-13). */
    @Test
    void createHelper_WithAvatarKeyFromOtherCategory_Returns400() throws IOException {
        String newsKey = storeFile("news");
        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Кузнецова")
                .firstName("Анна")
                .position("инженер")
                .avatar(newsKey)
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/helpers",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(STORAGE_ROOT.resolve(newsKey)).exists();
    }

    @Test
    void updateHelper_ReplacesFields() {
        HelpersEmployee helper = createHelper("Белова", "Ирина");

        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Белова")
                .firstName("Ирина")
                .position("методист")
                .build();

        ResponseEntity<HelpersEmployeeResponseDto> response = restTemplate.exchange(
                "/api/helpers/" + helper.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                HelpersEmployeeResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getPosition()).isEqualTo("методист");
    }

    @Test
    void updateHelper_WhenAvatarIsBlank_ClearsAvatarAndDeletesFile() throws IOException {
        HelpersEmployee helper = createHelper("Белова", "Ирина");
        String key = storeFile("avatars");
        helper.setAvatar(key);
        helpersEmployeeRepository.save(helper);

        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Белова")
                .firstName("Ирина")
                .position("инженер")
                .avatar("")
                .build();

        ResponseEntity<HelpersEmployeeResponseDto> response = restTemplate.exchange(
                "/api/helpers/" + helper.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                HelpersEmployeeResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAvatarUrl()).isNull();
        assertThat(helpersEmployeeRepository.findById(helper.getId()).orElseThrow().getAvatar()).isNull();
        assertThat(STORAGE_ROOT.resolve(key)).doesNotExist();
    }

    @Test
    void updateHelper_WhenAvatarKeyResubmitted_KeepsPhotoAndFile() throws IOException {
        HelpersEmployee helper = createHelper("Белова", "Ирина");
        String key = storeFile("avatars");
        helper.setAvatar(key);
        helpersEmployeeRepository.save(helper);

        ResponseEntity<PageResponseDto<HelpersEmployeeResponseDto>> listed = restTemplate.exchange(
                "/api/public/helpers",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(listed.getBody()).isNotNull();
        assertThat(listed.getBody().content().getFirst().getAvatar()).isEqualTo(key);

        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Белова")
                .firstName("Ирина")
                .position("ведущий инженер")
                .avatar(listed.getBody().content().getFirst().getAvatar())
                .build();

        ResponseEntity<HelpersEmployeeResponseDto> response = restTemplate.exchange(
                "/api/helpers/" + helper.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                HelpersEmployeeResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAvatar()).isEqualTo(key);
        assertThat(response.getBody().getPosition()).isEqualTo("ведущий инженер");
        assertThat(helpersEmployeeRepository.findById(helper.getId()).orElseThrow().getAvatar()).isEqualTo(key);
        assertThat(STORAGE_ROOT.resolve(key)).exists();
    }

    @Test
    void updateHelper_WhenUnknownId_Returns404() {
        HelpersEmployeeRequestDto request = HelpersEmployeeRequestDto.builder()
                .lastName("Белова")
                .firstName("Ирина")
                .position("методист")
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/helpers/9999",
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void deleteHelper_Returns204AndCardDisappears() {
        HelpersEmployee helper = createHelper("Белова", "Ирина");

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/helpers/" + helper.getId(),
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(moderatorToken())),
                Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(helpersEmployeeRepository.findById(helper.getId())).isEmpty();
    }
}
