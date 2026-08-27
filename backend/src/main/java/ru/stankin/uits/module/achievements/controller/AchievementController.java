package ru.stankin.uits.module.achievements.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.achievements.dto.AchievementRequestDto;
import ru.stankin.uits.module.achievements.dto.AchievementResponseDto;
import ru.stankin.uits.module.achievements.service.AchievementService;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AchievementController {

    private final AchievementService achievementService;

    @GetMapping("/public/achievements")
    public PageResponseDto<AchievementResponseDto> getAchievements(
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return achievementService.getPublishedAchievements(pageable);
    }

    @GetMapping("/public/achievements/{id}")
    public AchievementResponseDto getPublishedAchievement(@PathVariable Long id) {
        return achievementService.getPublishedById(id);
    }

    @GetMapping("/public/teachers/{teacherId}/achievements")
    public PageResponseDto<AchievementResponseDto> getTeacherAchievements(
            @PathVariable Long teacherId,
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return achievementService.getPublishedByTeacher(teacherId, pageable);
    }

    @GetMapping("/achievements")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public PageResponseDto<AchievementResponseDto> getAllAchievements(
            @PageableDefault(size = 20, sort = {"createdAt", "id"}, direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return achievementService.getAllAchievements(pageable);
    }

    @GetMapping("/achievements/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public AchievementResponseDto getAchievementById(@PathVariable Long id) {
        return achievementService.getAchievementById(id);
    }

    @PostMapping("/achievements")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<AchievementResponseDto> createAchievement(@Valid @RequestBody AchievementRequestDto request) {
        AchievementResponseDto created = achievementService.createAchievement(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/achievements/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public AchievementResponseDto updateAchievement(@PathVariable Long id,
                                                    @Valid @RequestBody AchievementRequestDto request) {
        return achievementService.updateAchievement(id, request);
    }

    @DeleteMapping("/achievements/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteAchievement(@PathVariable Long id) {
        achievementService.deleteAchievement(id);

        return ResponseEntity.noContent().build();
    }
}
