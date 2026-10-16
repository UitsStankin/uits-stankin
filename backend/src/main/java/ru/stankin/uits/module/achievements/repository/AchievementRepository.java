package ru.stankin.uits.module.achievements.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.achievements.entity.Achievement;

import java.util.Optional;

public interface AchievementRepository extends JpaRepository<Achievement, Long> {

    boolean existsByPreviewImage(String previewImage);

    boolean existsByContentContaining(String key);

    @EntityGraph(attributePaths = {"teacher"})
    Page<Achievement> findAllByDisplayTrue(Pageable pageable);

    @EntityGraph(attributePaths = {"teacher"})
    Optional<Achievement> findByIdAndDisplayTrue(Long id);

    @EntityGraph(attributePaths = {"teacher"})
    Page<Achievement> findAllByTeacherIdAndDisplayTrue(Long teacherId, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"teacher"})
    Optional<Achievement> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"teacher"})
    Page<Achievement> findAll(Pageable pageable);
}
