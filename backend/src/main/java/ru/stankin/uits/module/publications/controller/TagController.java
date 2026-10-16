package ru.stankin.uits.module.publications.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.module.publications.dto.TagDto;
import ru.stankin.uits.module.publications.dto.TagRequestDto;
import ru.stankin.uits.module.publications.service.TagService;

import java.net.URI;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TagController {

    private final TagService tagService;

    @GetMapping("/public/tags")
    public List<TagDto> getTags() {
        return tagService.getTags();
    }

    @PostMapping("/tags")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<TagDto> createTag(@Valid @RequestBody TagRequestDto request) {
        TagDto created = tagService.createTag(request);
        URI location = UriComponentsBuilder.fromPath("/api/tags/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/tags/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public TagDto updateTag(@PathVariable Long id, @Valid @RequestBody TagRequestDto request) {
        return tagService.updateTag(id, request);
    }

    @DeleteMapping("/tags/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteTag(@PathVariable Long id) {
        tagService.deleteTag(id);

        return ResponseEntity.noContent().build();
    }
}
