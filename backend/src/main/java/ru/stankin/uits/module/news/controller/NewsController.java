package ru.stankin.uits.module.news.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.service.NewsService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/public/news")
    public List<NewsResponseDto> getNews() {
        return newsService.getAllNews();
    }

    @PostMapping("/news")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public void createNews(@Valid @RequestBody NewsRequestDto request) {
        newsService.createNews(request);
    }
}