package ru.stankin.uits.module.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.module.user.dto.UserAdminResponseDto;
import ru.stankin.uits.module.user.dto.UserAdminUpdateRequestDto;
import ru.stankin.uits.module.user.dto.UserCreateRequestDto;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.module.user.mapper.UserMapper;
import ru.stankin.uits.module.user.repository.UserRepository;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponseDto<UserAdminResponseDto> getUsers(
            String q,
            Boolean active,
            String role,
            Pageable pageable
    ) {
        RoleFilter filter = RoleFilter.of(role);

        return PageResponseDto.from(userRepository
                .search(escapeLike(normalize(q)), active, filter.superuser(), filter.moderator(), filter.teacher(), pageable)
                .map(userMapper::toAdminDto));
    }

    @Transactional(readOnly = true)
    public UserAdminResponseDto getUser(Long id) {
        return userMapper.toAdminDto(findUser(id));
    }

    @Transactional
    public UserAdminResponseDto createUser(UserCreateRequestDto request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new InvalidRequestException("Логин уже занят: " + request.getUsername());
        }

        User user = userMapper.toEntity(request);
        user.setPassword(passwordEncoder.encode(request.getPassword()));

        return userMapper.toAdminDto(userRepository.save(user));
    }

    @Transactional
    public UserAdminResponseDto updateUser(Long id, Long currentUserId, UserAdminUpdateRequestDto request) {
        User user = findUser(id);

        validateSelfStaysAdmin(user, currentUserId, request);
        userMapper.updateEntity(user, request);

        return userMapper.toAdminDto(user);
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = findUser(id);

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokensNotBefore(sessionsCutoff());
    }

    @Transactional
    public void terminateSessions(Long id) {
        findUser(id).setTokensNotBefore(sessionsCutoff());
    }

    private User findUser(Long id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Пользователь id=" + id + " не найден"));
    }

    private static OffsetDateTime sessionsCutoff() {
        return OffsetDateTime.now().truncatedTo(ChronoUnit.SECONDS).plusSeconds(1);
    }

    private void validateSelfStaysAdmin(User user, Long currentUserId, UserAdminUpdateRequestDto request) {
        if (!user.getId().equals(currentUserId)) {
            return;
        }

        if (!request.getSuperuser() || !request.getActive()) {
            throw new InvalidRequestException("Нельзя снять с себя права администратора или заблокировать себя");
        }
    }

    private static String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String escapeLike(String value) {
        return value == null
                ? null
                : value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
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
