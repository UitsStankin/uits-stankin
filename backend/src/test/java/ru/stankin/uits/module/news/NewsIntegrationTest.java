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


    @Test
    void createNews_WhenAdmin_SavesToDb() {
        User savedAdmin = createAdmin();
        String token = login("admin");

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(validRequest(), token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<NewsPost> news = newsRepository.findAll();
        assertThat(news).hasSize(1);
        assertThat(news.getFirst().getTitle()).isEqualTo("Test News Title");
        assertThat(news.getFirst().getAuthor().getId()).isEqualTo(savedAdmin.getId());
    }

    @Test
    void createNews_WhenModerator_SavesToDb() {
        User moderator = User.builder()
                .username("moderator")
                .password(passwordEncoder.encode("password"))
                .superuser(false)
                .moderator(true)
                .active(true)
                .build();
        userRepository.save(moderator);

        String token = login("moderator");

        ResponseEntity<Void> response = restTemplate.postForEntity(
                "/api/news", withToken(validRequest(), token), Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(newsRepository.findAll()).hasSize(1);
    }

    @Test
    void createNews_WhenUser_ReturnsForbidden() {
        User user = User.builder()
                .username("user")
                .password(passwordEncoder.encode("password"))
                .superuser(false)
                .moderator(false)
                .active(true)
                .build();
        userRepository.save(user);

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

    private User createAdmin() {
        User admin = User.builder()
                .username("admin")
                .password(passwordEncoder.encode("password"))
                .superuser(true)
                .active(true)
                .build();
        return userRepository.save(admin);
    }

    private String createAdminAndLogin() {
        createAdmin();
        return login("admin");
    }

    private void saveNews(User author, String title, boolean display) {
        NewsPost post = NewsPost.builder()
                .title(title)
                .shortDescription("Desc")
                .postType("news")
                .content("Content")
                .display(display)
                .author(author)
                .build();
        newsRepository.save(post);
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
