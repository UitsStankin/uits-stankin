package ru.stankin.uits.module.pages.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.stankin.uits.module.pages.entity.EditablePage;

import java.util.Optional;

public interface EditablePageRepository extends JpaRepository<EditablePage, Long> {
    Optional<EditablePage> findBySlug(String slug);
}
