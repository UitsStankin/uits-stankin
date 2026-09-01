package ru.stankin.uits.module.publications;

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
import ru.stankin.uits.module.publications.dto.TagDto;
import ru.stankin.uits.module.publications.dto.TagRequestDto;
import ru.stankin.uits.module.publications.entity.Tag;
import ru.stankin.uits.module.publications.repository.TagRepository;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TagIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private TagRepository tagRepository;

    private Tag tag(String name) {
        return tagRepository.save(Tag.builder().name(name).build());
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

    private List<TagDto> tags() {
        ResponseEntity<List<TagDto>> response = restTemplate.exchange(
                "/api/public/tags",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {
                }
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        return response.getBody();
    }

    @Test
    void tagsAreListedAlphabetically() {
        tag("Machine learning");
        tag("Базы данных");
        tag("Алгоритмы");

        assertThat(tags())
                .extracting(TagDto::getName)
                .containsExactly("Machine learning", "Алгоритмы", "Базы данных");
    }

    @Test
    void emptyDictionaryGivesEmptyList() {
        assertThat(tags()).isEmpty();
    }

    @Test
    void moderatorCreatesTag() {
        ResponseEntity<TagDto> response = restTemplate.exchange(
                "/api/tags",
                HttpMethod.POST,
                new HttpEntity<>(TagRequestDto.builder().name("Оптимизация").build(), authJson(moderatorToken())),
                TagDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Оптимизация");
        assertThat(tagRepository.count()).isEqualTo(1);
    }

    @Test
    void tagNameIsTrimmedOnCreate() {
        ResponseEntity<TagDto> response = restTemplate.exchange(
                "/api/tags",
                HttpMethod.POST,
                new HttpEntity<>(TagRequestDto.builder().name("  Оптимизация  ").build(), authJson(moderatorToken())),
                TagDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Оптимизация");
    }

    @Test
    void duplicateNameIgnoringCaseReturns400() {
        tag("Алгоритмы");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/tags",
                HttpMethod.POST,
                new HttpEntity<>(TagRequestDto.builder().name("алгоритмы").build(), authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(tagRepository.count()).isEqualTo(1);
    }

    @Test
    void blankNameReturns400() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/tags",
                HttpMethod.POST,
                new HttpEntity<>(TagRequestDto.builder().name("   ").build(), authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(tagRepository.count()).isZero();
    }

    private ResponseEntity<TagDto> rename(Long id, String name, String token) {
        return restTemplate.exchange(
                "/api/tags/" + id,
                HttpMethod.PUT,
                new HttpEntity<>(new TagRequestDto(name), authJson(token)),
                TagDto.class
        );
    }

    @Test
    void moderatorRenamesTag() {
        Tag stored = tag("машиное обучение");

        ResponseEntity<TagDto> response = rename(stored.getId(), "машинное обучение", moderatorToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(stored.getId());
        assertThat(tagRepository.findById(stored.getId()).orElseThrow().getName()).isEqualTo("машинное обучение");
    }

    @Test
    void renameToNameTakenByAnotherTagReturns400() {
        tag("машинное обучение");
        Tag stored = tag("оптимизация");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/tags/" + stored.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(new TagRequestDto("Машинное Обучение"), authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(tagRepository.findById(stored.getId()).orElseThrow().getName()).isEqualTo("оптимизация");
    }

    @Test
    void renameChangingOnlyCaseIsAllowed() {
        Tag stored = tag("machine learning");

        ResponseEntity<TagDto> response = rename(stored.getId(), "Machine Learning", moderatorToken());

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(tagRepository.findById(stored.getId()).orElseThrow().getName()).isEqualTo("Machine Learning");
    }

    @Test
    void renamingUnknownTagReturns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/tags/999999",
                HttpMethod.PUT,
                new HttpEntity<>(new TagRequestDto("что угодно"), authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void moderatorDeletesTag() {
        Tag stored = tag("Алгоритмы");

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/tags/" + stored.getId(),
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(moderatorToken())),
                Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(tagRepository.findById(stored.getId())).isEmpty();
    }

    @Test
    void deletingUnknownTagReturns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/tags/999999",
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }
}
