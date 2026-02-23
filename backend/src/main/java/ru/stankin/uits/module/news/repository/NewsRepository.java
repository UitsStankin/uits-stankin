package ru.stankin.uits.module.news.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.news.entity.NewsPost;

import java.util.List;

public interface NewsRepository extends JpaRepository<NewsPost, Long> {
    List<NewsPost> findAllByDisplayTrueOrderByCreatedAtDesc();
}
