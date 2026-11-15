import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { http } from "msw";
import { useLocation } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  makeLesson,
  problemResponse,
  scheduleHandlers,
} from "@shared/api/mocks";
import { server } from "@shared/api/mocks/server";
import { renderWithProviders } from "@/test/render";

import ScheduleSummaryPage from "./index";

const ROUTE = "/educational-activities/schedule/schedule-summary";

/** Адрес, видимый роутеру: выбор преподавателей обязан оказаться в нём. */
function LocationProbe() {
  const { search } = useLocation();
  return <span data-testid="location-search">{search}</span>;
}

function renderPage(route: string = ROUTE) {
  return renderWithProviders(
    <>
      <ScheduleSummaryPage />
      <LocationProbe />
    </>,
    { route },
  );
}

function locationSearch(): string {
  return screen.getByTestId("location-search").textContent ?? "";
}

/**
 * Сегодняшний день подменяется только у `Date`: таймеры остаются
 * настоящими, иначе встали бы и ретраи запросов, и `findBy`.
 */
function setToday(year: number, month: number, day: number) {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(year, month - 1, day, 12, 0));
}

/** Названия пар в контейнере — в порядке показа. */
function lessonNames(container: HTMLElement): string[] {
  return within(container)
    .queryAllByRole("article")
    .map((item) => item.querySelector("p")?.textContent ?? "");
}

const SPRING = [
  { id: 1, startDate: "16.03", endDate: "27.04", alternativelyPeriod: false },
];

/**
 * Три первых преподавателя фикстуры, весна 2026 (16 марта — понедельник).
 * В ответе они идут по фамилии: Абрамов, Андреева, Баранов. В понедельник
 * первой парой — все трое, второй — один Абрамов: так видно, что внутри
 * дня пары собраны по номерам, а внутри номера — по преподавателю.
 * У Андреевой понедельничная пара без аудитории.
 */
const LESSONS = {
  1: [
    makeLesson({
      id: 11,
      weekNumber: 1,
      classTime: 1,
      name: "Базы данных",
      dates: SPRING,
    }),
    makeLesson({
      id: 12,
      weekNumber: 1,
      classTime: 2,
      name: "Архитектура ЭВМ",
      dates: SPRING,
    }),
  ],
  2: [
    makeLesson({
      id: 21,
      weekNumber: 1,
      classTime: 1,
      name: "Операционные системы",
      cabinet: null,
      dates: SPRING,
    }),
    makeLesson({
      id: 22,
      weekNumber: 3,
      classTime: 3,
      name: "Компьютерные сети",
      subgroup: "А",
      cabinet: "302",
      dates: SPRING,
    }),
  ],
  3: [
    makeLesson({
      id: 31,
      weekNumber: 1,
      classTime: 1,
      name: "Методы оптимизации",
      dates: SPRING,
    }),
  ],
};

afterEach(() => {
  vi.useRealTimers();
});

describe("ScheduleSummaryPage (F-57)", () => {
  beforeEach(() => {
    server.use(...scheduleHandlers(LESSONS));
  });

  it("показывает неделю по дням, внутри дня — по номерам пар, с преподавателем ссылкой", async () => {
    setToday(2026, 3, 18);
    renderPage();

    expect(await screen.findByRole("heading", { level: 1 })).toHaveTextContent(
      "Сводное расписание преподавателей",
    );
    expect(await screen.findByText("16–21 марта 2026 г.")).toBeInTheDocument();

    const monday = screen.getByRole("region", {
      name: "Понедельник, 16 марта",
    });
    expect(
      lessonNames(within(monday).getByRole("region", { name: "1 пара" })),
    ).toEqual(["Базы данных", "Операционные системы", "Методы оптимизации"]);
    expect(
      lessonNames(within(monday).getByRole("region", { name: "2 пара" })),
    ).toEqual(["Архитектура ЭВМ"]);
    expect(within(monday).getByText("8:30–10:10")).toBeInTheDocument();
    expect(
      within(monday).getAllByRole("link", {
        name: "Баранов Илья Матвеевич",
      })[0],
    ).toHaveAttribute("href", "/about/employee/teachers/3");

    // Сегодняшний день отмечен, день без пар остаётся с надписью.
    const wednesday = screen.getByRole("region", { name: "Среда, 18 марта" });
    expect(wednesday).toHaveAttribute("aria-current", "date");
    expect(
      within(wednesday).getByText(/ИДБ-23-01, подгруппа А · ауд\. 302/),
    ).toBeInTheDocument();
    expect(
      within(
        screen.getByRole("region", { name: "Вторник, 17 марта" }),
      ).getByText("Пар нет"),
    ).toBeInTheDocument();
  });

  it("отбирает преподавателей в адрес без новых запросов и возвращает всех", async () => {
    setToday(2026, 3, 18);
    let requests = 0;
    server.events.on("request:start", ({ request }) => {
      if (request.url.includes("/api/public/schedule")) requests += 1;
    });

    renderPage();

    const select = await screen.findByRole("combobox", {
      name: "Преподаватели",
    });
    expect(
      within(select)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "Все — выберите, чтобы отобрать",
      "Абрамов Никита Сергеевич",
      "Андреева Ольга Викторовна",
      "Баранов Илья Матвеевич",
    ]);

    fireEvent.change(select, { target: { value: "3" } });
    fireEvent.change(select, { target: { value: "1" } });

    expect(locationSearch()).toBe("?teacherId=3&teacherId=1");
    const chosen = screen.getByRole("list", {
      name: "Выбранные преподаватели",
    });
    expect(
      within(chosen).getByText("Баранов Илья Матвеевич"),
    ).toBeInTheDocument();
    // Выбранный из списка «добавить» уходит.
    expect(
      within(select).queryByRole("option", { name: "Баранов Илья Матвеевич" }),
    ).toBeNull();

    const monday = screen.getByRole("region", {
      name: "Понедельник, 16 марта",
    });
    expect(lessonNames(monday)).toEqual([
      "Базы данных",
      "Методы оптимизации",
      "Архитектура ЭВМ",
    ]);

    fireEvent.click(
      screen.getByRole("button", { name: "Убрать: Абрамов Никита Сергеевич" }),
    );
    expect(locationSearch()).toBe("?teacherId=3");
    expect(
      lessonNames(
        screen.getByRole("region", { name: "Понедельник, 16 марта" }),
      ),
    ).toEqual(["Методы оптимизации"]);

    fireEvent.click(screen.getByRole("button", { name: "Показать всех" }));
    expect(locationSearch()).toBe("");
    expect(
      lessonNames(
        screen.getByRole("region", { name: "Понедельник, 16 марта" }),
      ),
    ).toHaveLength(4);

    expect(requests).toBe(1);
  });

  it("берёт выбор из адреса; неизвестный id молча пропускает", async () => {
    setToday(2026, 3, 18);
    renderPage(`${ROUTE}?teacherId=2&teacherId=999&teacherId=abc`);

    const chosen = await screen.findByRole("list", {
      name: "Выбранные преподаватели",
    });
    expect(
      within(chosen)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual(["Андреева Ольга Викторовна", "Показать всех"]);
    expect(
      lessonNames(
        screen.getByRole("region", { name: "Понедельник, 16 марта" }),
      ),
    ).toEqual(["Операционные системы"]);
  });

  it("на ссылке только с неизвестными преподавателями говорит об этом и предлагает всех", async () => {
    setToday(2026, 3, 18);
    renderPage(`${ROUTE}?teacherId=999`);

    expect(
      await screen.findByText("Расписание выбранных преподавателей не найдено"),
    ).toBeInTheDocument();
    expect(screen.queryByText("16–21 марта 2026 г.")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Показать всех" }));

    expect(locationSearch()).toBe("");
    expect(await screen.findByText("16–21 марта 2026 г.")).toBeInTheDocument();
  });

  it("«только с аудиторией» прячет пары без аудитории", async () => {
    setToday(2026, 3, 18);
    renderPage(`${ROUTE}?teacherId=2`);

    const monday = await screen.findByRole("region", {
      name: "Понедельник, 16 марта",
    });
    expect(lessonNames(monday)).toEqual(["Операционные системы"]);

    fireEvent.click(
      screen.getByRole("checkbox", { name: "Только с аудиторией" }),
    );

    expect(
      within(
        screen.getByRole("region", { name: "Понедельник, 16 марта" }),
      ).getByText("Пар нет"),
    ).toBeInTheDocument();
    expect(
      lessonNames(screen.getByRole("region", { name: "Среда, 18 марта" })),
    ).toEqual(["Компьютерные сети"]);
  });

  it("без аудитории ни у одной пары показывает «Пар не найдено»", async () => {
    setToday(2026, 3, 18);
    server.use(
      ...scheduleHandlers({
        2: [makeLesson({ id: 21, cabinet: null, dates: SPRING })],
      }),
    );
    renderPage();

    fireEvent.click(
      await screen.findByRole("checkbox", { name: "Только с аудиторией" }),
    );

    expect(screen.getByText("Пар не найдено")).toBeInTheDocument();
    expect(screen.queryByText("16–21 марта 2026 г.")).not.toBeInTheDocument();
  });

  it("на пустой неделе называет ближайшую неделю с парами", async () => {
    setToday(2025, 11, 12);
    renderPage();

    // Год — текущий (2025), правило оригинала: весна ложится на 2025-й
    // и в ноябре уже позади.
    expect(
      await screen.findByText(
        /На этой неделе пар нет\. Последние были — 21–26 апреля 2025 г\./,
      ),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: "Показать эту неделю" }),
    );

    expect(screen.getByText("21–26 апреля 2025 г.")).toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Понедельник, 21 апреля" }),
    ).toBeInTheDocument();
  });

  it("без загруженных расписаний говорит об этом и не рисует выбор", async () => {
    server.use(...scheduleHandlers({}));
    renderPage();

    expect(
      await screen.findByText("Сводное расписание пока не загружено"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });

  it("на 500 показывает сбой и повторяет запрос", async () => {
    let calls = 0;
    server.use(
      http.get("*/api/public/schedule", () => {
        calls += 1;
        return problemResponse(500, {
          title: "Internal Server Error",
          detail: "Что-то пошло не так на сервере",
          instance: "/api/public/schedule",
        });
      }),
    );
    renderPage();

    expect(
      await screen.findByText("Не удалось загрузить сводное расписание"),
    ).toBeInTheDocument();
    const before = calls;
    fireEvent.click(screen.getByRole("button", { name: /Повторить/ }));
    await waitFor(() => {
      expect(calls).toBeGreaterThan(before);
    });
  });
});
