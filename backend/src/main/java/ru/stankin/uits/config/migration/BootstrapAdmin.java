package ru.stankin.uits.config.migration;

import liquibase.Scope;
import liquibase.change.custom.CustomTaskChange;
import liquibase.changelog.DatabaseChangeLog;
import liquibase.database.Database;
import liquibase.database.jvm.JdbcConnection;
import liquibase.exception.CustomChangeException;
import liquibase.exception.ValidationErrors;
import liquibase.resource.ResourceAccessor;

import java.sql.SQLException;
import java.util.regex.Pattern;

public class BootstrapAdmin implements CustomTaskChange {
    private static final Pattern BCRYPT = Pattern.compile("\\$2[aby]\\$(?:0[4-9]|[12][0-9]|3[01])\\$[./A-Za-z0-9]{53}");

    @Override
    public void execute(Database database) throws CustomChangeException {
        // Параметр читается при выполнении. Удаление секрета после первого входа
        // не меняет контрольную сумму уже применённой миграции.
        var changelog = Scope.getCurrentScope().get(Scope.Attr.databaseChangeLog, DatabaseChangeLog.class);
        Object hash = changelog.getChangeLogParameters().getValue("bootstrapAdminHash", changelog);
        if (!(hash instanceof String value) || !BCRYPT.matcher(value).matches()) {
            throw new CustomChangeException("Для первого администратора задайте BOOTSTRAP_ADMIN_HASH"
                    + " (bcrypt). См. docs/DEPLOY.md §1.1.");
        }
        var connection = ((JdbcConnection) database.getConnection()).getUnderlyingConnection();
        try (var insert = connection.prepareStatement("""
                INSERT INTO users_user (username, password, is_superuser, is_staff, is_moderator, is_active, date_joined)
                VALUES ('admin', ?, true, true, true, true, now())
                """)) {
            insert.setString(1, value);
            insert.executeUpdate();
        } catch (SQLException ex) {
            throw new CustomChangeException("Не удалось создать первого администратора", ex);
        }
    }

    @Override
    public String getConfirmationMessage() {
        return "Создан первый администратор";
    }

    @Override
    public ValidationErrors validate(Database database) {
        return new ValidationErrors();
    }

    @Override
    public void setUp() {
        // Подготовка не требуется.
    }

    @Override
    public void setFileOpener(ResourceAccessor accessor) {
        // Внешние файлы не используются.
    }
}
