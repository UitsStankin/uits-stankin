package ru.stankin.uits.module.pages.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.pages.dto.EditablePageRequestDto;
import ru.stankin.uits.module.pages.dto.EditablePageResponseDto;
import ru.stankin.uits.module.pages.entity.EditablePage;
import ru.stankin.uits.module.pages.mapper.EditablePageMapper;
import ru.stankin.uits.module.pages.repository.EditablePageRepository;

@Service
@RequiredArgsConstructor
public class EditablePageService {
    private final EditablePageRepository editablePageRepository;
    private final EditablePageMapper editablePageMapper;

    @Transactional(readOnly = true)
    public EditablePageResponseDto getBySlug(String slug) {
        return editablePageRepository.findBySlug(slug)
                .map(editablePageMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Раздел " + slug + " не найден"));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<EditablePageResponseDto> getAll(Pageable pageable) {
        return PageResponseDto.from(editablePageRepository.findAll(pageable)
                .map(editablePageMapper::toDto));
    }

    @Transactional
    public EditablePageResponseDto update(String slug, EditablePageRequestDto editablePageRequestDto) {
        EditablePage editablePage = editablePageRepository.findBySlug(slug)
                .orElseThrow(() -> new NotFoundException("Раздел " + slug + " не найден"));

        editablePage.setTitle(editablePageRequestDto.getTitle());
        editablePage.setText(editablePageRequestDto.getText());

        return editablePageMapper.toDto(editablePageRepository.saveAndFlush(editablePage));
    }

}
