package ru.stankin.uits.module.publications;

import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
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
import ru.stankin.uits.module.publications.dto.PublicationRequestDto;
import ru.stankin.uits.module.publications.dto.PublicationResponseDto;
import ru.stankin.uits.module.publications.dto.TagDto;
import ru.stankin.uits.module.publications.entity.ScientificPublication;
import ru.stankin.uits.module.publications.entity.Tag;
import ru.stankin.uits.module.publications.repository.PublicationRepository;
import ru.stankin.uits.module.publications.repository.TagRepository;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class PublicationIntegrationTest extends AbstractIntegrationTest {

    @Autowired
    private PublicationRepository publicationRepository;

    @Autowired
    private TagRepository tagRepository;

    @Autowired
    private EntityManagerFactory entityManagerFactory;

    private Tag optimization;
    private Tag machineLearning;
    private ScientificPublication cutting;
    private ScientificPublication forecast;

    @BeforeEach
    void setUp() {
        optimization = tag("Оптимизация");
        machineLearning = tag("Машинное обучение");

        cutting = publication("Методы упаковки в задачах раскроя",
                List.of("Чеканин В.А.", "Чеканин А.В."), 2024, Set.of(optimization));
        forecast = publication("Прогнозирование отказов оборудования",
                List.of("Разумовский А.И."), 2021, Set.of(machineLearning, optimization));
    }

    private Tag tag(String name) {
        return tagRepository.save(Tag.builder().name(name).build());
    }

    private ScientificPublication publication(String name, List<String> authors, int year, Set<Tag> tags) {
        return publicationRepository.save(ScientificPublication.builder()
                .name(name)
                .authors(authors)
                .description("Описание работы «" + name + "»")
                .source("Вестник МГТУ «Станкин»")
                .year(year)
                .tags(new LinkedHashSet<>(tags))
                .build());
    }

    private PublicationRequestDto.PublicationRequestDtoBuilder request() {
        return PublicationRequestDto.builder()
                .name("Новая публикация")
                .authors(List.of("Иванов И.И."))
                .description("Описание")
                .source("Сборник конференции")
                .year(2025);
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

    private PageResponseDto<PublicationResponseDto> page(String query) {
        ResponseEntity<PageResponseDto<PublicationResponseDto>> response = restTemplate.exchange(
                "/api/public/publications" + query,
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {
                }
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();

        return response.getBody();
    }

    @Test
    void listWithTagsIsFetchedInTwoQueries() {
        Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
        statistics.setStatisticsEnabled(true);
        statistics.clear();

        page("").content().forEach(card -> assertThat(card.getTags()).isNotNull());

        assertThat(statistics.getPrepareStatementCount()).isEqualTo(2);
    }

    @Test
    void listIsOrderedByYearDescending() {
        assertThat(page("").content())
                .extracting(PublicationResponseDto::getName)
                .containsExactly("Методы упаковки в задачах раскроя", "Прогнозирование отказов оборудования");
    }

    @Test
    void listCarriesAuthorsAndTags() {
        PublicationResponseDto card = page("").content().getFirst();

        assertThat(card.getAuthors()).containsExactly("Чеканин В.А.", "Чеканин А.В.");
        assertThat(card.getSource()).isEqualTo("Вестник МГТУ «Станкин»");
        assertThat(card.getTags()).extracting(TagDto::getName).containsExactly("Оптимизация");
        assertThat(card.getFile()).isNull();
        assertThat(card.getFileUrl()).isNull();
    }

    @Test
    void tagFilterNarrowsSelection() {
        assertThat(page("?tagId=" + machineLearning.getId()).content())
                .extracting(PublicationResponseDto::getId)
                .containsExactly(forecast.getId());

        assertThat(page("?tagId=" + optimization.getId()).content()).hasSize(2);
    }

    @Test
    void yearFilterNarrowsSelection() {
        assertThat(page("?year=2021").content())
                .extracting(PublicationResponseDto::getId)
                .containsExactly(forecast.getId());
    }

    @Test
    void authorFilterMatchesSubstringIgnoringCase() {
        assertThat(page("?author=чеканин").content())
                .extracting(PublicationResponseDto::getId)
                .containsExactly(cutting.getId());
    }

    @Test
    void filtersApplyTogether() {
        assertThat(page("?author=Чеканин&year=2021").content()).isEmpty();
        assertThat(page("?author=Чеканин&year=2024&tagId=" + optimization.getId()).content())
                .extracting(PublicationResponseDto::getId)
                .containsExactly(cutting.getId());
    }

    @Test
    void blankFiltersAreIgnored() {
        assertThat(page("?author=").content()).hasSize(2);
    }

    @Test
    void paginationReportsTotals() {
        PageResponseDto<PublicationResponseDto> firstPage = page("?size=1");

        assertThat(firstPage.content()).hasSize(1);
        assertThat(firstPage.totalElements()).isEqualTo(2);
        assertThat(firstPage.totalPages()).isEqualTo(2);
    }

    @Test
    void singlePublicationIsReadable() {
        ResponseEntity<PublicationResponseDto> response = restTemplate.getForEntity(
                "/api/public/publications/" + cutting.getId(), PublicationResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Методы упаковки в задачах раскроя");
    }

    @Test
    void unknownPublicationGives404() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/publications/999999", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void moderatorCreatesPublicationWithTags() {
        PublicationRequestDto request = request()
                .tagIds(List.of(optimization.getId(), machineLearning.getId()))
                .build();

        ResponseEntity<PublicationResponseDto> response = restTemplate.exchange(
                "/api/publications",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                PublicationResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(response.getHeaders().getLocation()).isNotNull();
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getAuthors()).containsExactly("Иванов И.И.");
        assertThat(response.getBody().getTags())
                .extracting(TagDto::getName)
                .containsExactlyInAnyOrder("Оптимизация", "Машинное обучение");
    }

    @Test
    void createWithUnknownTagReturns400() {
        PublicationRequestDto request = request().tagIds(List.of(999999L)).build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/publications",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(publicationRepository.count()).isEqualTo(2);
    }

    @Test
    void createWithoutAuthorsReturns400() {
        PublicationRequestDto request = request().authors(List.of()).build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/publications",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void createWithJavascriptUrlReturns400() {
        PublicationRequestDto request = request().url("javascript:alert(1)").build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/publications",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(publicationRepository.count()).isEqualTo(2);
    }

    @Test
    void createWithUnknownFileKeyReturns400() {
        PublicationRequestDto request = request().file("publications/2026/08/missing.pdf").build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/publications",
                HttpMethod.POST,
                new HttpEntity<>(request, authJson(moderatorToken())),
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(publicationRepository.count()).isEqualTo(2);
    }

    @Test
    void updateReplacesFieldsAndTags() {
        PublicationRequestDto request = request()
                .name("Переименованная работа")
                .authors(List.of("Чеканин В.А."))
                .year(2020)
                .tagIds(List.of(machineLearning.getId()))
                .build();

        ResponseEntity<PublicationResponseDto> response = restTemplate.exchange(
                "/api/publications/" + cutting.getId(),
                HttpMethod.PUT,
                new HttpEntity<>(request, authJson(moderatorToken())),
                PublicationResponseDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getName()).isEqualTo("Переименованная работа");
        assertThat(response.getBody().getYear()).isEqualTo(2020);
        assertThat(response.getBody().getTags()).extracting(TagDto::getName).containsExactly("Машинное обучение");
    }

    @Test
    void moderatorDeletesPublication() {
        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/publications/" + forecast.getId(),
                HttpMethod.DELETE,
                new HttpEntity<>(authJson(moderatorToken())),
                Void.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(publicationRepository.findById(forecast.getId())).isEmpty();
        assertThat(tagRepository.count()).isEqualTo(2);
    }

    @Test
    void deletingTagKeepsPublications() {
        tagRepository.deleteById(optimization.getId());

        assertThat(page("").content()).hasSize(2);
        assertThat(page("").content().getFirst().getTags()).isEmpty();
    }
}
