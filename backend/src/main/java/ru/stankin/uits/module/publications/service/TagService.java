package ru.stankin.uits.module.publications.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.publications.dto.TagDto;
import ru.stankin.uits.module.publications.dto.TagRequestDto;
import ru.stankin.uits.module.publications.entity.Tag;
import ru.stankin.uits.module.publications.mapper.TagMapper;
import ru.stankin.uits.module.publications.repository.TagRepository;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TagService {

    private static final Sort NAME_SORT = Sort.by("name");

    private final TagRepository tagRepository;
    private final TagMapper tagMapper;

    @Transactional(readOnly = true)
    public List<TagDto> getTags() {
        return tagRepository.findAllBy(NAME_SORT).stream()
                .map(tagMapper::toDto)
                .toList();
    }

    @Transactional
    public TagDto createTag(TagRequestDto request) {
        String name = request.getName().trim();
        if (tagRepository.existsByNameIgnoreCase(name)) {
            throw new InvalidRequestException("Тег с названием «" + name + "» уже существует");
        }

        return tagMapper.toDto(tagRepository.save(Tag.builder().name(name).build()));
    }

    @Transactional
    public TagDto updateTag(Long id, TagRequestDto request) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Тег id=" + id + " не найден"));
        String name = request.getName().trim();

        if (tagRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new InvalidRequestException("Тег с названием «" + name + "» уже существует");
        }

        tag.setName(name);

        return tagMapper.toDto(tag);
    }

    @Transactional
    public void deleteTag(Long id) {
        Tag tag = tagRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Тег id=" + id + " не найден"));

        tagRepository.delete(tag);
    }
}
