package ru.stankin.uits.module.pages.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.stankin.uits.common.PageResponseDto;
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
}
