package ru.stankin.uits.module.news.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.stankin.uits.common.validation.HtmlSanitizer;
import ru.stankin.uits.common.exception.InvalidFileException;
import ru.stankin.uits.common.exception.InvalidRequestException;
import ru.stankin.uits.common.exception.NotFoundException;
import ru.stankin.uits.common.PageResponseDto;
import ru.stankin.uits.common.storage.FileCleanup;
import ru.stankin.uits.common.storage.FileStorage;
import ru.stankin.uits.module.news.PostType;
import ru.stankin.uits.module.news.dto.NewsRequestDto;
import ru.stankin.uits.module.news.dto.NewsResponseDto;
import ru.stankin.uits.module.news.entity.NewsPost;
import ru.stankin.uits.module.news.mapper.NewsMapper;
import ru.stankin.uits.module.news.repository.NewsRepository;
import ru.stankin.uits.module.user.entity.User;
import ru.stankin.uits.security.SecurityUser;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
@RequiredArgsConstructor
public class NewsService {

    private static final String NEWS_CATEGORY = "news";

    private static final String THUMBNAIL_SUFFIX = "_thumb";

    private final NewsRepository newsRepository;
    private final NewsMapper newsMapper;
    private final FileStorage fileStorage;
    private final FileCleanup fileCleanup;

    @Transactional
    public NewsResponseDto createNews(NewsRequestDto request) {
        User currentUser = getCurrentUser();
        request.setContent(HtmlSanitizer.sanitize(request.getContent()));
        validatePreviewImage(request);
        NewsPost newsPost = newsMapper.toEntity(request);
        newsPost.setAuthor(currentUser);
        newsPost.setPreviewThumbnail(thumbnailFor(newsPost.getPreviewImage()));
        NewsPost saved = newsRepository.save(newsPost);

        return newsMapper.toDto(saved);
    }

    /**
     * Ключ миниатюры для обложки. Он выводится из основного ключа, но проверяется
     * на диске один раз здесь, при записи: у новостей, загруженных до появления
     * миниатюр, второго файла нет, и список не должен отдавать адрес в пустоту.
     */
    private String thumbnailFor(String previewImage) {
        if (previewImage == null) {
            return null;
        }

        String key = fileStorage.variantKey(previewImage, THUMBNAIL_SUFFIX);

        return fileStorage.exists(key) ? key : null;
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
    public PageResponseDto<NewsResponseDto> getPublishedNews(String postType, Pageable pageable) {
        validatePostType(postType);

        if (postType == null || postType.isBlank()) {
            return PageResponseDto.from(newsRepository.findAllByDisplayTrue(pageable)
                .map(newsMapper::toDto));
        } else {
            return PageResponseDto.from(newsRepository.findAllByDisplayTrueAndPostType(postType, pageable)
                .map(newsMapper::toDto));
        }
    }

    @Transactional(readOnly = true)
    public NewsResponseDto getPublishedById(Long id) {
        return newsRepository.findByIdAndDisplayTrue(id)
                .map(newsMapper::toDto)
                .orElseThrow(() -> new NotFoundException("Опубликованная новость id=" + id + " не найдена"));
    }

    @Transactional(readOnly = true)
    public PageResponseDto<NewsResponseDto> getAllNews(String postType, Pageable pageable) {
        validatePostType(postType);

        if (postType == null || postType.isBlank()) {
            return PageResponseDto.from(newsRepository.findAll(pageable)
                .map(newsMapper::toDto));
        } else {
            return PageResponseDto.from(newsRepository.findAllByPostType(postType, pageable)
                .map(newsMapper::toDto));
        }
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
        request.setContent(HtmlSanitizer.sanitize(request.getContent()));
        validatePreviewImage(request);

        String oldKey = newsPost.getPreviewImage();
        String oldThumbnail = newsPost.getPreviewThumbnail();
        newsMapper.updateEntity(newsPost, request);

        if (oldKey != null && !oldKey.equals(newsPost.getPreviewImage())) {
            newsPost.setPreviewThumbnail(thumbnailFor(newsPost.getPreviewImage()));
            fileCleanup.deleteAfterCommit(oldKey);

            if (oldThumbnail != null) {
                fileCleanup.deleteAfterCommit(oldThumbnail);
            }
        }

        return newsMapper.toDto(newsPost);
    }

    @Transactional
    public void deleteNews(Long id) {
        NewsPost newsPost = newsRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Новость id=" + id + " не найдена"));
        String key = newsPost.getPreviewImage();
        String thumbnail = newsPost.getPreviewThumbnail();

        newsRepository.delete(newsPost);

        if (key != null) {
            fileCleanup.deleteAfterCommit(key);
        }
        if (thumbnail != null) {
            fileCleanup.deleteAfterCommit(thumbnail);
        }
    }

    private void validatePostType(String postType) {
        if (postType == null || postType.isBlank() || PostType.ALLOWED.contains(postType)) {
            return;
        } else {
            throw new InvalidRequestException("Неизвестный тип записи: " + postType);
        }
    }

    private void validatePreviewImage(NewsRequestDto request) {
        String key = request.getPreviewImage();
        if (key != null && !fileStorage.existsInCategory(key, NEWS_CATEGORY)) {
            throw new InvalidFileException("Файл обложки не найден: " + key);
        }
    }
}
