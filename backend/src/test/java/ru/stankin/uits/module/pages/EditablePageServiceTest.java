package ru.stankin.uits.module.pages;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mapstruct.factory.Mappers;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.pages.dto.EditablePageResponseDto;
import ru.stankin.uits.module.pages.entity.EditablePage;
import ru.stankin.uits.module.pages.mapper.EditablePageMapper;
import ru.stankin.uits.module.pages.repository.EditablePageRepository;
import ru.stankin.uits.module.pages.service.EditablePageService;

import java.time.OffsetDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EditablePageServiceTest {

    @Mock
    private EditablePageRepository editablePageRepository;

    private final EditablePageMapper editablePageMapper = Mappers.getMapper(EditablePageMapper.class);

    @Test
    void getPublicBySlugHidesRestrictedPagesWithNotFound() {
        EditablePageService service = new EditablePageService(editablePageRepository, editablePageMapper);
        EditablePage restricted = EditablePage.builder()
                .id(14L)
                .slug("staff-links")
                .title("Полезные ссылки")
                .text("## Модули")
                .restricted(true)
                .createdAt(OffsetDateTime.now())
                .updatedAt(OffsetDateTime.now())
                .build();
        when(editablePageRepository.findBySlug("staff-links")).thenReturn(Optional.of(restricted));

        assertThatThrownBy(() -> service.getPublicBySlug("staff-links"))
                .isInstanceOf(NotFoundException.class);

        EditablePageResponseDto authedDto = service.getBySlug("staff-links");
        assertThat(authedDto.isRestricted()).isTrue();
        assertThat(authedDto.getSlug()).isEqualTo("staff-links");
    }
}
