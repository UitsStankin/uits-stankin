package ru.stankin.uits.module.staff.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeRequestDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeResponseDto;
import ru.stankin.uits.module.staff.service.HelpersEmployeeService;

import java.net.URI;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HelpersEmployeeController {

    private final HelpersEmployeeService helpersEmployeeService;

    @GetMapping("/public/helpers")
    public PageResponseDto<HelpersEmployeeResponseDto> getAllHelpers(
            @PageableDefault(size = 20, sort = {"lastName", "firstName", "id"}) Pageable pageable
    ) {
        return helpersEmployeeService.getAllHelpers(pageable);
    }

    @PostMapping("/helpers")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<HelpersEmployeeResponseDto> createHelper(
            @Valid @RequestBody HelpersEmployeeRequestDto request) {
        HelpersEmployeeResponseDto created = helpersEmployeeService.createHelper(request);
        URI location = ServletUriComponentsBuilder.fromCurrentRequest()
                .path("/{id}")
                .buildAndExpand(created.getId())
                .toUri();

        return ResponseEntity.created(location).body(created);
    }

    @PutMapping("/helpers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public HelpersEmployeeResponseDto updateHelper(@PathVariable Long id,
                                                   @Valid @RequestBody HelpersEmployeeRequestDto request) {
        return helpersEmployeeService.updateHelper(id, request);
    }

    @DeleteMapping("/helpers/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MODERATOR')")
    public ResponseEntity<Void> deleteHelper(@PathVariable Long id) {
        helpersEmployeeService.deleteHelper(id);

        return ResponseEntity.noContent().build();
    }
}
