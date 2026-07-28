package ru.stankin.uits.module.news.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.news.entity.NewsPost;

public interface NewsRepository extends JpaRepository<NewsPost, Long> {
    @EntityGraph(attributePaths = {"author"})
    Page<NewsPost> findAllByDisplayTrue(Pageable pageable);
}
