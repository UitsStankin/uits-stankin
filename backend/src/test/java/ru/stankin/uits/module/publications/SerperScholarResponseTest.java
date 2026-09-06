package ru.stankin.uits.module.publications;

import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.Test;
import ru.stankin.uits.module.publications.client.SerperScholarResponse;

import static org.assertj.core.api.Assertions.assertThat;

class SerperScholarResponseTest {

    @Test
    void parsesResponseIgnoringUnknownFields() {
        String json = """
                {
                  "searchParameters": { "q": "Чеканин упаковка", "hl": "ru", "type": "scholar", "num": 10, "page": 1, "engine": "google" },
                  "organic": [
                    {
                      "title": "Оптимизация решения задачи ортогональной упаковки объектов",
                      "link": "https://cyberleninka.ru/article/n/optimizatsiya-resheniya-zadachi-ortogonalnoy-upakovki-obektov",
                      "publicationInfo": "ВА Чеканин, АВ Чеканин - Прикладная информатика, 2012 - cyberleninka.ru",
                      "snippet": "… задача ортогональной упаковки …",
                      "year": 2012,
                      "citedBy": 12,
                      "id": "abc123"
                    },
                    {
                      "title": "К вопросу о повышении плотности ортогональной упаковки",
                      "publicationInfo": "ВА Чеканин, АВ Чеканин - Информационные системы и технологии ИСТ-2018, 2018",
                      "year": 2018,
                      "citedBy": 1,
                      "id": "LvlihZ5rQOoJ"
                    }
                  ],
                  "credits": 1
                }
                """;

        SerperScholarResponse response = JsonMapper.builder().build().readValue(json, SerperScholarResponse.class);

        assertThat(response.getOrganic()).hasSize(2);
        assertThat(response.getOrganic().getFirst().getTitle()).isEqualTo("Оптимизация решения задачи ортогональной упаковки объектов");
        assertThat(response.getOrganic().getLast().getLink()).isNull();
    }
}
