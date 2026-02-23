package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.mapper.NewsMapper;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.SecurityUser;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;

    public void createNews(NewsRequestDto request) {
        User currentUser = getCurrentUser();
        NewsPost newsPost = newsMapper.toEntity(request);
        newsPost.setAuthor(currentUser);
        newsRepository.save(newsPost);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new IllegalStateException("No authentication found");
        }

        if (!authentication.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof SecurityUser securityUser)) {
            throw new IllegalStateException("Principal is not SecurityUser: " +
                                           (principal != null ? principal.getClass() : "null"));
        }

        User user = securityUser.getUser();
        if (user == null) {
            throw new IllegalStateException("User not found in SecurityUser");
        }

        return user;
    }

    public List<NewsResponseDto> getAllNews() {
        return newsRepository.findAllByDisplayTrueOrderByCreatedAtDesc()
                .stream()
                .map(newsMapper::toDto)
                .toList();
    }
}