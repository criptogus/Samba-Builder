import { describe, expect, it } from "vitest";
import {
  MAX_PROJECT_LESSONS,
  renderProjectLessonsBlock,
  selectProjectLessons,
  type LessonUnit,
} from "./lessons";

const NOW = Date.UTC(2026, 8, 10);

function unit(overrides: Partial<LessonUnit> = {}): LessonUnit {
  return {
    id: "ku_1",
    kind: "erro_evitar",
    title: "Não usar node antigo no projeto",
    body: "O projeto exige Node >=24; rodar npm com v22 falha com EBADENGINE.",
    context: { profile: "private", phase: "development", area: "security" },
    force: 1,
    createdAt: NOW - 1000 * 60 * 60 * 24,
    status: "active",
    ...overrides,
  };
}

describe("selectProjectLessons", () => {
  it("puts what avoids rework before what merely inspires", () => {
    const lessons = selectProjectLessons(
      [
        unit({ id: "padrao", kind: "padrao_validado", title: "Padrão" }),
        unit({ id: "erro", kind: "erro_evitar", title: "Erro" }),
      ],
      { now: NOW },
    );
    expect(lessons.map((lesson) => lesson.id)).toEqual(["erro", "padrao"]);
  });

  it("drops inactive and expired units", () => {
    const lessons = selectProjectLessons(
      [
        unit({ id: "ativo" }),
        unit({ id: "inativo", status: "contradito" }),
        unit({ id: "vencido", expiresAt: NOW - 1 }),
      ],
      { now: NOW },
    );
    expect(lessons.map((lesson) => lesson.id)).toEqual(["ativo"]);
  });

  it("ranks a lesson that matches the current context above an unrelated one", () => {
    const lessons = selectProjectLessons(
      [
        unit({
          id: "outro-contexto",
          context: { profile: "public", phase: "briefing", area: "design" },
        }),
        unit({
          id: "mesmo-contexto",
          context: {
            profile: "private",
            phase: "development",
            area: "security",
          },
        }),
      ],
      { now: NOW, profile: "private", phase: "development", area: "security" },
    );
    expect(lessons[0].id).toBe("mesmo-contexto");
    expect(lessons[0].reasons).toContain("mesmo perfil");
  });

  it("rewards force and explains it", () => {
    const lessons = selectProjectLessons(
      [unit({ id: "fraco", force: 1 }), unit({ id: "forte", force: 4 })],
      { now: NOW },
    );
    expect(lessons[0].id).toBe("forte");
    expect(lessons[0].reasons).toContain("4 fontes");
  });

  it("uses signals from the current work to break ties", () => {
    const lessons = selectProjectLessons(
      [
        unit({ id: "sem-sinal", title: "Outra coisa", body: "nada a ver" }),
        unit({
          id: "com-sinal",
          title: "Lexical duplicado",
          body: "Duas cópias do core do lexical quebram as mentions.",
        }),
      ],
      { now: NOW, signals: ["lexical", "mentions"] },
    );
    expect(lessons[0].id).toBe("com-sinal");
  });

  it("never returns more than the budget", () => {
    const many = Array.from({ length: 12 }, (_, index) =>
      unit({ id: `ku_${index}`, createdAt: NOW - index * 1000 }),
    );
    expect(selectProjectLessons(many, { now: NOW })).toHaveLength(
      MAX_PROJECT_LESSONS,
    );
    expect(selectProjectLessons(many, { now: NOW, limit: 2 })).toHaveLength(2);
  });

  it("is deterministic for the same input", () => {
    const many = Array.from({ length: 6 }, (_, index) =>
      unit({ id: `ku_${index}`, force: 2, createdAt: NOW }),
    );
    const first = selectProjectLessons(many, { now: NOW }).map((l) => l.id);
    const second = selectProjectLessons(many, { now: NOW }).map((l) => l.id);
    expect(first).toEqual(second);
  });

  it("prefers recent lessons when everything else is equal", () => {
    const lessons = selectProjectLessons(
      [
        unit({ id: "velha", createdAt: NOW - 1000 * 60 * 60 * 24 * 300 }),
        unit({ id: "nova", createdAt: NOW - 1000 * 60 * 60 }),
      ],
      { now: NOW },
    );
    expect(lessons[0].id).toBe("nova");
    expect(lessons[0].reasons).toContain("recente");
  });
});

describe("renderProjectLessonsBlock", () => {
  it("returns null with nothing to say", () => {
    expect(renderProjectLessonsBlock([])).toBeNull();
  });

  it("labels each lesson and keeps the source audit trail honest", () => {
    const lessons = selectProjectLessons([unit()], { now: NOW });
    const block = renderProjectLessonsBlock(lessons)!;

    expect(block).toContain("<project_lessons>");
    expect(block).toContain("[evitar]");
    expect(block).toContain("Não usar node antigo no projeto");
    expect(block).toContain("EBADENGINE");
    // o agente é instruído a julgar, não a obedecer
    expect(block).toMatch(/Aplique apenas o que couber/);
    expect(block).toContain("</project_lessons>");
  });

  it("truncates a long body so the block stays inside the prompt budget", () => {
    const lessons = selectProjectLessons([unit({ body: "x".repeat(2000) })], {
      now: NOW,
    });
    const block = renderProjectLessonsBlock(lessons)!;
    expect(block).toContain("…");
    expect(block.length).toBeLessThan(900);
  });

  it("renders every kind with a readable label", () => {
    const lessons = selectProjectLessons(
      [
        unit({ id: "a", kind: "erro_evitar" }),
        unit({ id: "b", kind: "padrao_validado" }),
        unit({ id: "c", kind: "skill_delta" }),
        unit({ id: "d", kind: "episodio" }),
      ],
      { now: NOW },
    );
    const block = renderProjectLessonsBlock(lessons)!;
    for (const label of ["[evitar]", "[validado]", "[prática]", "[contexto]"]) {
      expect(block).toContain(label);
    }
  });
});
