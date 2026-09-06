package ru.stankin.uits.module.publications.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.publications.entity.ScholarSearchCache;

import java.util.Optional;

public interface ScholarSearchCacheRepository extends JpaRepository<ScholarSearchCache, Long> {

    Optional<ScholarSearchCache> findByQueryAndPage(String query, int page);
}
