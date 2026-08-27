package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.mapper.NewsMapper;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.SecurityUser;
import org.springframework.security.core.context.SecurityContextHolder;

@Slf4j
@Service
@RequiredArgsConstructor
public class NewsService {

    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;
    private final FileStorage fileStorage;

    @Transactional
    public NewsResponseDto createNews(NewsRequestDto request) {
        User currentUser = getCurrentUser();
        request.setContent(Jsoup.clean(request.getContent(), Safelist.relaxed().preserveRelativeLinks(true)));
        validatePreviewImage(request);
        NewsPost newsPost = newsMapper.toEntity(request);
        newsPost.setAuthor(currentUser);
        NewsPost saved = newsRepository.save(newsPost);

        return newsMapper.toDto(saved);
    }

    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null) {
            throw new IllegalStateException("No authentication found");
        }

        if (!authentication.isAuthenticated()) {
            throw new IllegalStateException("User not authenticated");
        }

        Object principal = authentication.getPrincipal();
        if (!(principal instanceof SecurityUser securityUser)) {
            throw new IllegalStateException("Principal is not SecurityUser: " +
                                           (principal != null ? principal.getClass() : "null"));
        }

        User user = securityUser.getUser();
        if (user == null) {
            throw new IllegalStateException("User not found in SecurityUser");
        }

        return user;
    }

    @Transactional(readOnly = true)
    public PageResponseDto<NewsResponseDto> getPublishedNews(Pageable pageable) {
        return PageResponseDto.from(newsRepository.findAllByDisplayTrue(pageable)
                .map(newsMapper::toDto));
    }

    @Transactional(readOnly = true)
    public NewsResponseDto getPublishedById(Long id) {
        return newsRepository.findByIdAndDisplayTrue(id)
                .map(newsMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Опубликованная новость id=" + id + " не найдена"));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<NewsResponseDto> getAllNews(Pageable pageable) {
        return PageResponseDto.from(newsRepository.findAll(pageable)
                .map(newsMapper::toDto));
    }

    @Transactional(readOnly = true)
    public NewsResponseDto getNewsById(Long id) {
        return newsRepository.findById(id)
                .map(newsMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Новость id=" + id + " не найдена"));
    }

    @Transactional
    public NewsResponseDto updateNews(Long id, NewsRequestDto request) {
        NewsPost newsPost = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Новость id=" + id + " не найдена"));
        request.setContent(Jsoup.clean(request.getContent(), Safelist.relaxed().preserveRelativeLinks(true)));
        validatePreviewImage(request);

        String oldKey = newsPost.getPreviewImage();
        newsMapper.updateEntity(newsPost, request);

        if (oldKey != null && !oldKey.equals(newsPost.getPreviewImage())) {
            deleteFileAfterCommit(oldKey);
        }

        return newsMapper.toDto(newsPost);
    }

    @Transactional
    public void deleteNews(Long id) {
        NewsPost newsPost = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Новость id=" + id + " не найдена"));
        String key = newsPost.getPreviewImage();

        newsRepository.delete(newsPost);

        if (key != null) {
            deleteFileAfterCommit(key);
        }
    }

    /**
     * Откладывает удаление файла до успешного коммита: диск транзакцию не откатывает.
     * Сбой самой уборки не пробрасывается: коммит уже прошёл, и исключение отсюда
     * превратило бы удавшийся запрос в 500. Файл остаётся сиротой — это забота T-31.
     */
    private void deleteFileAfterCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                try {
                    fileStorage.delete(key);
                } catch (RuntimeException e) {
                    log.warn("Не удалось удалить файл обложки {}: файл останется в хранилище", key, e);
                }
            }
        });
    }

    private void validatePreviewImage(NewsRequestDto request) {
        String key = request.getPreviewImage();
        if (key != null && !fileStorage.exists(key)) {
            throw new InvalidFileException("Файл обложки не найден: " + key);
        }
    }
}
