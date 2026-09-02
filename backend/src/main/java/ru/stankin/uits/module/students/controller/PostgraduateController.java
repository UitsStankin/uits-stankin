package ru.stankin.uits.module.students.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.util.UriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.students.dto.PostgraduateDetailsResponseDto;
import ru.stankin.uits.module.students.dto.PostgraduateRequestDto;
import ru.stankin.uits.module.students.dto.PostgraduateResponseDto;
import ru.stankin.uits.module.students.service.PostgraduateService;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class PostgraduateController {

    private final PostgraduateService postgraduateService;

    @GetMapping("/public/postgraduates")
    public PageResponseDto<PostgraduateResponseDto> getPostgraduates(
            @RequestParam(name = "teacherId", required = false) Long teacherId,
            @RequestParam(name = "speciality", required = false) String speciality,
            @PageableDefault(size = 20, sort = {"student.lastName", "student.firstName", "id"}) Pageable pageable
    ) {
        return postgraduateService.getPostgraduates(teacherId, speciality, pageable);
    }

    @GetMapping("/postgraduates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PostgraduateDetailsResponseDto getPostgraduate(@PathVariable Long id) {
        return postgraduateService.getPostgraduate(id);
    }

    @PostMapping("/postgraduates")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<PostgraduateResponseDto> createPostgraduate(
            @Valid @RequestBody PostgraduateRequestDto request) {
        PostgraduateResponseDto created = postgraduateService.createPostgraduate(request);
        URI location = UriComponentsBuilder.fromPath("/api/postgraduates/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/postgraduates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PostgraduateResponseDto updatePostgraduate(@PathVariable Long id,
                                                      @Valid @RequestBody PostgraduateRequestDto request) {
        return postgraduateService.updatePostgraduate(id, request);
    }

    @DeleteMapping("/postgraduates/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deletePostgraduate(@PathVariable Long id) {
        postgraduateService.deletePostgraduate(id);

        return ResponseEntity.noContent().build();
    }
}
