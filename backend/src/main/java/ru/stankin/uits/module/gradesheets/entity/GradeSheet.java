package ru.stankin.uits.module.gradesheets.entity;

import jakarta.persistence.*;
import lombok.*;
import ru.stankin.uits.module.staff.entity.Subject;
import ru.stankin.uits.module.staff.entity.Teacher;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.Set;

@Entity
@Table(name = "gradesheet_gradesheet")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GradeSheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "discipline_name", length = 256, nullable = false)
    private String disciplineName;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id")
    private Subject subject;

    @Column(name = "\"group\"", length = 64, nullable = false)
    private String group;

    @Column(name = "semester", length = 128, nullable = false)
    private String semester;

    @Column(name = "direction", length = 256)
    private String direction;

    @Column(name = "department", length = 128)
    private String department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id")
    private Teacher teacher;

    @Column(name = "imported_teachers", length = 256)
    private String importedTeachers;

    @Column(name = "imported_file_name", length = 256)
    private String importedFileName;

    @Column(name = "imported_at", nullable = false)
    private OffsetDateTime importedAt;

    @Builder.Default
    @OneToMany(mappedBy = "gradeSheet", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("studentNumber, lastName, id")
    private Set<GradeSheetStudent> students = new LinkedHashSet<>();

    public void addStudent(GradeSheetStudent student) {
        students.add(student);
        student.setGradeSheet(this);
    }

    @PrePersist
    protected void onCreate() {
        if (importedAt == null) {
            importedAt = OffsetDateTime.now();
        }
    }
}
