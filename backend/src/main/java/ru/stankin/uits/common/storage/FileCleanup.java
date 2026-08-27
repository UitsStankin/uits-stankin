package ru.stankin.uits.common.storage;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

/**
 * Удаление файла, оставшегося без сущности.
 *
 * <p>Уборка отложена до успешного коммита: диск транзакцию не откатывает. Сбой уборки
 * не пробрасывается — коммит уже прошёл, и исключение отсюда превратило бы удавшийся
 * запрос в 500. Файл в этом случае остаётся сиротой, за них отвечает T-31.
 *
 * <p>Перед удалением ключ проверяется по всем модулям: один и тот же файл может стоять
 * обложкой у двух сущностей, и тогда правка одной сносила бы картинку у другой.
 * Проверка идёт после коммита, поэтому ссылка удаляемой сущности в базе уже снята.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class FileCleanup {

    private final FileStorage fileStorage;
    private final List<FileUsageProbe> probes;

    public void deleteAfterCommit(String key) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                deleteIfUnused(key);
            }
        });
    }

    private void deleteIfUnused(String key) {
        try {
            if (probes.stream().anyMatch(probe -> probe.uses(key))) {
                log.debug("Файл {} остаётся: на него ссылается другая запись", key);
                return;
            }

            fileStorage.delete(key);
        } catch (RuntimeException e) {
            log.warn("Не удалось удалить файл {}: файл останется в хранилище", key, e);
        }
    }
}
