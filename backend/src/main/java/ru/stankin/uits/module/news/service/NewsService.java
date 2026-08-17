package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.NotFoundException;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.mapper.NewsMapper;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.SecurityUser;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;

    @Transactional
    public NewsResponseDto createNews(NewsRequestDto request) {
        User currentUser = getCurrentUser();
        request.setContent(Jsoup.clean(request.getContent(), Safelist.relaxed().preserveRelativeLinks(true)));
        NewsPost newsPost = newsMapper.toEntity(request);
        newsPost.setAuthor(currentUser);
        NewsPost saved = newsRepository.save(newsPost);

        return newsMapper.toDto(saved);
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

    @Transactional(readOnly = true)
    public PageResponseDto<NewsResponseDto> getPublishedNews(Pageable pageable) {
        return PageResponseDto.from(newsRepository.findAllByDisplayTrue(pageable)
                .map(newsMapper::toDto));
    }

    @Transactional(readOnly = true)
    public NewsResponseDto getPublishedById(Long id) {
        return newsRepository.findByIdAndDisplayTrue(id)
                .map(newsMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Опубликованная новость id=" + id + " не найдена"));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<NewsResponseDto> getAllNews(Pageable pageable) {
        return PageResponseDto.from(newsRepository.findAll(pageable)
                .map(newsMapper::toDto));
    }

    @Transactional(readOnly = true)
    public NewsResponseDto getNewsById(Long id) {
        return newsRepository.findById(id)
                .map(newsMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Новость id=" + id + " не найдена"));
    }

    @Transactional
    public NewsResponseDto updateNews(Long id, NewsRequestDto request) {
        NewsPost newsPost = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Новость id=" + id + " не найдена"));
        request.setContent(Jsoup.clean(request.getContent(), Safelist.relaxed().preserveRelativeLinks(true)));
        newsMapper.updateEntity(newsPost, request);

        return newsMapper.toDto(newsPost);
    }

    @Transactional
    public void deleteNews(Long id) {
        if (!newsRepository.existsById(id)) {
            throw new NotFoundException("Новость id=" + id + " не найдена");
        }

        newsRepository.deleteById(id);
    }
}