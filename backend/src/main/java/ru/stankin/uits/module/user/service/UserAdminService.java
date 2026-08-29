package ru.stankin.uits.module.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.user.dto.UserAdminResponseDto;
import ru.stankin.uits.module.user.mapper.UserMapper;
import ru.stankin.uits.module.user.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public PageResponseDto<UserAdminResponseDto> getUsers(
            String q,
            Boolean active,
            String role,
            Pageable pageable
    ) {
        RoleFilter filter = RoleFilter.of(role);

        return PageResponseDto.from(userRepository
                .search(normalize(q), active, filter.superuser(), filter.moderator(), filter.teacher(), pageable)
                .map(userMapper::toAdminDto));
    }

    @Transactional(readOnly = true)
    public UserAdminResponseDto getUser(Long id) {
        return userRepository.findById(id)
                .map(userMapper::toAdminDto)
                .orElseThrow(() -> new NotFoundException("Пользователь id=" + id + " не найден"));
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record RoleFilter(Boolean superuser, Boolean moderator, Boolean teacher) {

        private static final RoleFilter ANY = new RoleFilter(null, null, null);

        private static RoleFilter of(String role) {
            if (role == null || role.isBlank()) {
                return ANY;
            }

            return switch (role) {
                case "admin" -> new RoleFilter(true, null, null);
                case "moderator" -> new RoleFilter(null, true, null);
                case "teacher" -> new RoleFilter(null, null, true);
                case "user" -> new RoleFilter(false, false, false);
                default -> throw new InvalidRequestException("Неизвестная роль: " + role);
            };
        }
    }
}
