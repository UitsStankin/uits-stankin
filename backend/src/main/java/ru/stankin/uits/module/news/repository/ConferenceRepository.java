package ru.stankin.uits.module.news.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.news.entity.ConferenceAnnouncement;

import java.util.Optional;

public interface ConferenceRepository extends JpaRepository<ConferenceAnnouncement, Long> {

    boolean existsByPreviewImage(String previewImage);

    boolean existsByContentContaining(String key);

    Page<ConferenceAnnouncement> findAllByDisplayTrue(Pageable pageable);

    Optional<ConferenceAnnouncement> findByIdAndDisplayTrue(Long id);
}
