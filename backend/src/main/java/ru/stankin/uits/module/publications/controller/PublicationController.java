package ru.stankin.uits.module.publications.controller;

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
import ru.stankin.uits.module.publications.dto.PublicationRequestDto;
import ru.stankin.uits.module.publications.dto.PublicationResponseDto;
import ru.stankin.uits.module.publications.service.PublicationService;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PublicationController {

    private final PublicationService publicationService;

    @GetMapping("/public/publications")
    public PageResponseDto<PublicationResponseDto> getPublications(
            @RequestParam(name = "tagId", required = false) Long tagId,
            @RequestParam(name = "author", required = false) String author,
            @RequestParam(name = "year", required = false) Integer year,
            @PageableDefault(size = 20, sort = {"year", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return publicationService.getPublications(tagId, author, year, pageable);
    }

    @GetMapping("/public/publications/{id}")
    public PublicationResponseDto getPublication(@PathVariable Long id) {
        return publicationService.getPublication(id);
    }

    @PostMapping("/publications")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<PublicationResponseDto> createPublication(
            @Valid @RequestBody PublicationRequestDto request) {
        PublicationResponseDto created = publicationService.createPublication(request);
        URI location = UriComponentsBuilder.fromPath("/api/publications/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/publications/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PublicationResponseDto updatePublication(@PathVariable Long id,
                                                    @Valid @RequestBody PublicationRequestDto request) {
        return publicationService.updatePublication(id, request);
    }

    @DeleteMapping("/publications/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deletePublication(@PathVariable Long id) {
        publicationService.deletePublication(id);

        return ResponseEntity.noContent().build();
    }
}
