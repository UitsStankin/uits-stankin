package ru.stankin.uits.module.publications.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.module.publications.dto.ScholarSearchItemDto;
import ru.stankin.uits.module.publications.mapper.ScholarSearchMapper;
import ru.stankin.uits.module.publications.service.ScholarSearchService;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ScholarSearchController {

    private final ScholarSearchService scholarSearchService;
    private final ScholarSearchMapper scholarSearchMapper;

    @GetMapping("/publications/scholar")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public List<ScholarSearchItemDto> search(@RequestParam String q,
                                             @RequestParam(defaultValue = "0") int page) {
        return scholarSearchMapper.toDtos(scholarSearchService.search(q, page));
    }
}
