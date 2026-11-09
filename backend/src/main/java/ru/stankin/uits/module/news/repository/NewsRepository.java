package ru.stankin.uits.module.news.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.news.entity.NewsPost;

import java.util.Optional;

public interface NewsRepository extends JpaRepository<NewsPost, Long> {

    boolean existsByPreviewImage(String previewImage);

    boolean existsByPreviewThumbnail(String previewThumbnail);

    boolean existsByContentContaining(String key);
    @EntityGraph(attributePaths = {"author"})
    Page<NewsPost> findAllByDisplayTrue(Pageable pageable);

    @EntityGraph(attributePaths = {"author"})
    Optional<NewsPost> findByIdAndDisplayTrue(Long id);

    @EntityGraph(attributePaths = {"author"})
    Page<NewsPost> findAllByDisplayTrueAndPostType(String postType, Pageable pageable); // for public

    @EntityGraph(attributePaths = {"author"})
    Page<NewsPost> findAllByPostType(String postType, Pageable pageable); // for admin

    @Override
    @EntityGraph(attributePaths = {"author"})
    Optional<NewsPost> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"author"})
    Page<NewsPost> findAll(Pageable pageable);
}
