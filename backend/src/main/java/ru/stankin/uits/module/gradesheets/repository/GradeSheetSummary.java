package ru.stankin.uits.module.gradesheets.repository;

import java.time.OffsetDateTime;

public interface GradeSheetSummary {

    Long getId();

    String getDiscipline();

    String getGroup();

    String getSemester();

    String getDepartment();

    String getDirection();

    String getTeachers();

    int getStudentCount();

    String getImportedFileName();

    OffsetDateTime getImportedAt();
}
