package ru.stankin.uits.module.publications.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import ru.stankin.uits.module.publications.entity.ScientificPublication;

import java.util.Collection;
import java.util.List;

public interface PublicationRepository extends JpaRepository<ScientificPublication, Long> {

    String FILTERS = """
            where (:year is null or p.year = :year)
              and (:author is null or p.author::text ilike '%' || :author || '%')
              and (:tagId is null or exists (
                    select 1 from scientific_publications_scientificpublication_tags pt
                    where pt.scientificpublication_id = p.id and pt.tag_id = :tagId))
            """;

    @Query(value = "select p.* from scientific_publications_scientificpublication p " + FILTERS,
            countQuery = "select count(*) from scientific_publications_scientificpublication p " + FILTERS,
            nativeQuery = true)
    Page<ScientificPublication> search(@Param("tagId") Long tagId,
                                       @Param("author") String author,
                                       @Param("year") Integer year,
                                       Pageable pageable);

    @EntityGraph(attributePaths = "tags")
    List<ScientificPublication> findWithTagsByIdIn(Collection<Long> ids);

    @Query(value = """
            select distinct author.value
            from scientific_publications_scientificpublication p,
                 lateral jsonb_array_elements_text(p.author) as author(value)
            order by author.value
            """, nativeQuery = true)
    List<String> findDistinctAuthors();

    boolean existsByFile(String file);
}
