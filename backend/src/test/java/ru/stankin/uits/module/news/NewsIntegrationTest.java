package ru.stankin.uits.module.news;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.stankin.uits.AbstractIntegrationTest;
import ru.stankin.uits.module.auth.controller.AuthController;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.util.List;

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
        User admin = User.builder()
                .username("admin")
                .password(passwordEncoder.encode("password"))
                .superuser(true)
                .active(true)
                .build();
        User savedAdmin = userRepository.save(admin);

        String token = login("admin", "password");

        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("Test Content")
                .display(true)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<NewsRequestDto> entity = new HttpEntity<>(request, headers);

        ResponseEntity<Void> response = restTemplate.postForEntity("/api/news", entity, Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        List<NewsPost> news = newsRepository.findAll();
        assertThat(news).hasSize(1);
        assertThat(news.getFirst().getTitle()).isEqualTo("Test News Title");
        assertThat(news.getFirst().getAuthor().getId()).isEqualTo(savedAdmin.getId());
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

        String token = login("user", "password");

        NewsRequestDto request = NewsRequestDto.builder()
                .title("Test News Title")
                .shortDescription("Test Description")
                .postType("news")
                .content("Test Content")
                .display(true)
                .build();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        HttpEntity<NewsRequestDto> entity = new HttpEntity<>(request, headers);

        ResponseEntity<Void> response = restTemplate.postForEntity("/api/news", entity, Void.class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(newsRepository.findAll()).isEmpty();
    }

    @Test
    void getNews_ReturnsPublicNews() {
        User admin = User.builder()
                .username("admin")
                .password(passwordEncoder.encode("password"))
                .superuser(true)
                .active(true)
                .build();
        userRepository.save(admin);

        NewsPost newsPost = NewsPost.builder()
                .title("Public News")
                .shortDescription("Desc")
                .postType("news")
                .content("Content")
                .display(true)
                .author(admin)
                .build();
        newsRepository.save(newsPost);

        NewsPost hiddenPost = NewsPost.builder()
                .title("Hidden News")
                .shortDescription("Desc")
                .postType("news")
                .content("Content")
                .display(false)
                .author(admin)
                .build();
        newsRepository.save(hiddenPost);

        ResponseEntity<NewsResponseDto[]> response = restTemplate.getForEntity("/api/public/news", NewsResponseDto[].class);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).hasSize(1);
        assertThat(response.getBody()[0].getTitle()).isEqualTo("Public News");
    }

    private String login(String username, String password) {
        AuthController.LoginRequest loginRequest = new AuthController.LoginRequest(username, password);
        ResponseEntity<AuthController.LoginResponse> response = restTemplate.postForEntity(
                "/api/users/auth/login",
                loginRequest,
                AuthController.LoginResponse.class
        );
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        return response.getBody().access_token();
    }
}

