package ru.stankin.uits.module.news.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.service.NewsService;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class NewsController {

    private final NewsService newsService;

    @GetMapping("/public/news")
    public PageResponseDto<NewsResponseDto> getNews(
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return newsService.getPublishedNews(pageable);
    }

    @GetMapping("/public/news/{id}")
    public NewsResponseDto getPublishedNews(@PathVariable Long id) {
        return newsService.getPublishedById(id);
    }

    @GetMapping("/news")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PageResponseDto<NewsResponseDto> getAllNews(
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return newsService.getAllNews(pageable);
    }

    @GetMapping("/news/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public NewsResponseDto getNewsById(@PathVariable Long id) {
        return newsService.getNewsById(id);
    }

    @PostMapping("/news")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<NewsResponseDto> createNews(@Valid @RequestBody NewsRequestDto request) {
        NewsResponseDto created = newsService.createNews(request);
        URI location = UriComponentsBuilder.fromPath("/api/news/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/news/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public NewsResponseDto updateNews(@PathVariable Long id, @Valid @RequestBody NewsRequestDto request) {
        return newsService.updateNews(id, request);
    }

    @DeleteMapping("/news/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteNews(@PathVariable Long id) {
        newsService.deleteNews(id);

        return ResponseEntity.noContent().build();
    }
}
