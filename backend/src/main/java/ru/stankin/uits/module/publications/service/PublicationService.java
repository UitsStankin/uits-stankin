package ru.stankin.uits.module.publications.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.publications.dto.PublicationRequestDto;
import ru.stankin.uits.module.publications.dto.PublicationResponseDto;
import ru.stankin.uits.module.publications.entity.ScientificPublication;
import ru.stankin.uits.module.publications.entity.Tag;
import ru.stankin.uits.module.publications.mapper.PublicationMapper;
import ru.stankin.uits.module.publications.repository.PublicationRepository;
import ru.stankin.uits.module.publications.repository.TagRepository;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PublicationService {

    private static final String PUBLICATION_CATEGORY = "publications";

    private final PublicationRepository publicationRepository;
    private final TagRepository tagRepository;
    private final PublicationMapper publicationMapper;
    private final FileStorage fileStorage;
    private final FileCleanup fileCleanup;

    @Transactional(readOnly = true)
    public PageResponseDto<PublicationResponseDto> getPublications(Long tagId,
                                                                   String author,
                                                                   Integer year,
                                                                   Pageable pageable) {
        Page<ScientificPublication> page = publicationRepository.search(tagId, normalize(author), year, pageable);
        warmUpTags(page.getContent());

        return PageResponseDto.from(page.map(publicationMapper::toDto));
    }

    @Transactional(readOnly = true)
    public List<String> getAuthors() {
        return publicationRepository.findDistinctAuthors();
    }

    @Transactional(readOnly = true)
    public PublicationResponseDto getPublication(Long id) {
        return publicationRepository.findById(id)
                .map(publicationMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Публикация id=" + id + " не найдена"));
    }

    @Transactional
    public PublicationResponseDto createPublication(PublicationRequestDto request) {
        validateFile(request.getFile());
        ScientificPublication publication = publicationMapper.toEntity(request);
        publication.setTags(resolveTags(request.getTagIds()));

        return publicationMapper.toDto(publicationRepository.save(publication));
    }

    @Transactional
    public PublicationResponseDto updatePublication(Long id, PublicationRequestDto request) {
        ScientificPublication publication = publicationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Публикация id=" + id + " не найдена"));
        validateFile(request.getFile());
        Set<Tag> tags = resolveTags(request.getTagIds());

        String oldKey = publication.getFile();
        publicationMapper.updateEntity(publication, request);
        publication.setTags(tags);

        if (oldKey != null && !Objects.equals(oldKey, publication.getFile())) {
            fileCleanup.deleteAfterCommit(oldKey);
        }

        return publicationMapper.toDto(publication);
    }

    @Transactional
    public void deletePublication(Long id) {
        ScientificPublication publication = publicationRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Публикация id=" + id + " не найдена"));
        String key = publication.getFile();

        publicationRepository.delete(publication);
        if (key != null) {
            fileCleanup.deleteAfterCommit(key);
        }
    }

    private void warmUpTags(List<ScientificPublication> publications) {
        if (publications.isEmpty()) {
            return;
        }

        publicationRepository.findWithTagsByIdIn(publications.stream()
                .map(ScientificPublication::getId)
                .toList());
    }

    private Set<Tag> resolveTags(List<Long> tagIds) {
        if (tagIds == null || tagIds.isEmpty()) {
            return new LinkedHashSet<>();
        }

        List<Tag> found = tagRepository.findAllById(tagIds);
        if (found.size() != Set.copyOf(tagIds).size()) {
            throw new InvalidRequestException("Среди переданных тегов есть несуществующие");
        }

        return new LinkedHashSet<>(found);
    }

    private void validateFile(String key) {
        if (key == null) {
            return;
        }

        if (!fileStorage.existsInCategory(key, PUBLICATION_CATEGORY)) {
            throw new InvalidFileException("Файл публикации не найден: " + key);
        }
    }

    private String normalize(String author) {
        if (author == null || author.isBlank()) {
            return null;
        }

        return author.trim();
    }
}
