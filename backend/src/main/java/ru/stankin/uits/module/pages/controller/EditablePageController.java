package ru.stankin.uits.module.pages.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.pages.dto.EditablePageRequestDto;
import ru.stankin.uits.module.pages.dto.EditablePageResponseDto;
import ru.stankin.uits.module.pages.service.EditablePageService;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EditablePageController {
    private final EditablePageService editablePageService;

    @GetMapping("/public/pages/{slug}")
    public EditablePageResponseDto getBySlug(@PathVariable String slug) {
        return editablePageService.getBySlug(slug);
    }

    @GetMapping("/pages")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PageResponseDto<EditablePageResponseDto> getAll(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return editablePageService.getAll(pageable);
    }

    @PutMapping("/pages/{slug}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public EditablePageResponseDto update(
            @PathVariable String slug,
            @Valid @RequestBody EditablePageRequestDto request) {
        return editablePageService.update(slug, request);
    }
}
