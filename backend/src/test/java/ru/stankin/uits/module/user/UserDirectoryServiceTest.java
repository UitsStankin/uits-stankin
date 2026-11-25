package ru.stankin.uits.module.user;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.user.dto.UserDirectoryDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.enums.UserDirectoryScope;
import ru.stankin.uits.module.user.mapper.UserMapper;
import ru.stankin.uits.module.user.repository.UserRepository;
import ru.stankin.uits.module.user.service.UserService;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserDirectoryServiceTest {

    @Mock
    private UserMapper userMapper;

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private FileStorage fileStorage;

    @Mock
    private FileCleanup fileCleanup;

    @Test
    void getDirectoryRoutesTeachersVsAllToDistinctQueries() {
        UserService userService = new UserService(userMapper, userRepository, passwordEncoder, fileStorage, fileCleanup);
        Pageable pageable = PageRequest.of(0, 50);

        User teacher = User.builder().id(1L).lastName("Преподов").firstName("Иван").teacher(true).active(true).build();
        User staff = User.builder().id(2L).lastName("Чебан").firstName("Ирина").teacher(false).active(true).build();

        when(userRepository.findByTeacherTrueAndActiveTrue(pageable))
                .thenReturn(new PageImpl<>(List.of(teacher), pageable, 1));
        when(userRepository.findByActiveTrue(pageable))
                .thenReturn(new PageImpl<>(List.of(teacher, staff), pageable, 2));
        when(userMapper.toDirectoryDto(teacher)).thenReturn(new UserDirectoryDto(1L, "Преподов", "Иван"));
        when(userMapper.toDirectoryDto(staff)).thenReturn(new UserDirectoryDto(2L, "Чебан", "Ирина"));

        PageResponseDto<UserDirectoryDto> teachersOnly = userService.getDirectory(UserDirectoryScope.TEACHERS, pageable);
        assertThat(teachersOnly.content()).extracting(UserDirectoryDto::getLastName).containsExactly("Преподов");
        verify(userRepository).findByTeacherTrueAndActiveTrue(pageable);

        PageResponseDto<UserDirectoryDto> allStaff = userService.getDirectory(UserDirectoryScope.ALL, pageable);
        assertThat(allStaff.content()).extracting(UserDirectoryDto::getLastName).containsExactly("Преподов", "Чебан");
        verify(userRepository).findByActiveTrue(pageable);
    }

    @Test
    void getDirectoryRejectsSensitiveOrUnknownSortFields() {
        UserService userService = new UserService(userMapper, userRepository, passwordEncoder, fileStorage, fileCleanup);

        for (String field : List.of("email", "username", "password", "lastLogin")) {
            Pageable badSort = PageRequest.of(0, 50, Sort.by(field));
            assertThatThrownBy(() -> userService.getDirectory(UserDirectoryScope.TEACHERS, badSort))
                    .isInstanceOf(InvalidRequestException.class);
        }

        verifyNoInteractions(userRepository);
    }
}
