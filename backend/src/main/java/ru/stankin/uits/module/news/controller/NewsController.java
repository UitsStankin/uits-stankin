package ru.stankin.uits.module.news.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.service.NewsService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/public/news")
    public PageResponseDto<NewsResponseDto> getNews(
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return newsService.getAllNews(pageable);
    }

    @PostMapping("/news")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public void createNews(@Valid @RequestBody NewsRequestDto request) {
        newsService.createNews(request);
    }
}