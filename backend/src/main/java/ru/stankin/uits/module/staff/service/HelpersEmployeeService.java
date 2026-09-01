package ru.stankin.uits.module.staff.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeRequestDto;
import ru.stankin.uits.module.staff.dto.HelpersEmployeeResponseDto;
import ru.stankin.uits.module.staff.entity.HelpersEmployee;
import ru.stankin.uits.module.staff.mapper.HelpersEmployeeMapper;
import ru.stankin.uits.module.staff.repository.HelpersEmployeeRepository;

@Service
@RequiredArgsConstructor
public class HelpersEmployeeService {

    private static final String AVATAR_CATEGORY = "avatars";

    private final HelpersEmployeeRepository helpersEmployeeRepository;
    private final HelpersEmployeeMapper helpersEmployeeMapper;
    private final FileStorage fileStorage;
    private final FileCleanup fileCleanup;

    @Transactional(readOnly = true)
    public PageResponseDto<HelpersEmployeeResponseDto> getAllHelpers(Pageable pageable) {
        return PageResponseDto.from(helpersEmployeeRepository.findAll(pageable)
                .map(helpersEmployeeMapper::toDto));
    }

    @Transactional(readOnly = true)
    public HelpersEmployeeResponseDto getHelper(Long id) {
        return helpersEmployeeMapper.toDto(helpersEmployeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Сотрудник УВП id=" + id + " не найден")));
    }

    @Transactional
    public HelpersEmployeeResponseDto createHelper(HelpersEmployeeRequestDto request) {
        validateAvatar(request);

        return helpersEmployeeMapper.toDto(
                helpersEmployeeRepository.save(helpersEmployeeMapper.toEntity(request)));
    }

    @Transactional
    public HelpersEmployeeResponseDto updateHelper(Long id, HelpersEmployeeRequestDto request) {
        HelpersEmployee employee = helpersEmployeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Сотрудник УВП id=" + id + " не найден"));
        validateAvatar(request);

        String oldAvatarKey = employee.getAvatar();
        helpersEmployeeMapper.updateEntity(employee, request);

        if (oldAvatarKey != null && !oldAvatarKey.equals(employee.getAvatar())) {
            fileCleanup.deleteAfterCommit(oldAvatarKey);
        }

        return helpersEmployeeMapper.toDto(employee);
    }

    @Transactional
    public void deleteHelper(Long id) {
        HelpersEmployee employee = helpersEmployeeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Сотрудник УВП id=" + id + " не найден"));
        String avatarKey = employee.getAvatar();

        helpersEmployeeRepository.delete(employee);

        if (avatarKey != null) {
            fileCleanup.deleteAfterCommit(avatarKey);
        }
    }

    private void validateAvatar(HelpersEmployeeRequestDto request) {
        String key = request.getAvatar();
        if (key != null && !fileStorage.existsInCategory(key, AVATAR_CATEGORY)) {
            throw new InvalidFileException("Файл аватара не найден: " + key);
        }
    }
}
