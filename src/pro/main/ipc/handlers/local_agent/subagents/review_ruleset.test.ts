import { describe, expect, it } from "vitest";
import {
  extractAddedLines,
  findTablesMissingRls,
  runReviewRules,
} from "./review_ruleset";

function diffFor(path: string, addedLines: string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    "index 1111111..2222222 100644",
    `--- a/${path}`,
    `+++ b/${path}`,
    `@@ -1,1 +1,${addedLines.length + 1} @@`,
    " const keep = 1;",
    ...addedLines.map((line) => `+${line}`),
  ].join("\n");
}

describe("extractAddedLines", () => {
  it("numera as linhas adicionadas no arquivo novo, por arquivo", () => {
    const diff = [
      "diff --git a/src/a.ts b/src/a.ts",
      "--- a/src/a.ts",
      "+++ b/src/a.ts",
      "@@ -10,2 +10,3 @@",
      " const before = 1;",
      "+const added = 2;",
      " const after = 3;",
      "diff --git a/src/b.ts b/src/b.ts",
      "--- a/src/b.ts",
      "+++ b/src/b.ts",
      "@@ -1,1 +1,2 @@",
      "-removed",
      "+const other = 4;",
    ].join("\n");

    expect(extractAddedLines(diff)).toEqual([
      { path: "src/a.ts", line: 11, content: "const added = 2;" },
      { path: "src/b.ts", line: 1, content: "const other = 4;" },
    ]);
  });

  it("ignora cabeçalhos, remoções e arquivo deletado", () => {
    const diff = [
      "diff --git a/gone.ts b/gone.ts",
      "--- a/gone.ts",
      "+++ /dev/null",
      "@@ -1,1 +0,0 @@",
      "-const gone = 1;",
    ].join("\n");

    expect(extractAddedLines(diff)).toEqual([]);
  });
});

describe("runReviewRules", () => {
  it("acusa HTML não confiável direto no DOM", () => {
    const findings = runReviewRules(
      diffFor("src/App.tsx", [
        "dangerouslySetInnerHTML={{ __html: userInput }}",
      ]),
    );

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "xss-unsafe-html",
    ]);
    expect(findings[0]).toMatchObject({
      path: "src/App.tsx",
      line: 2,
      severity: "high",
    });
  });

  it("não acusa HTML literal fixo", () => {
    expect(
      runReviewRules(
        diffFor("src/App.tsx", [
          'dangerouslySetInnerHTML={{ __html: "<b>ok</b>" }}',
        ]),
      ),
    ).toEqual([]);
  });

  it("acusa SQL montado por interpolação e não a consulta parametrizada", () => {
    expect(
      runReviewRules(
        diffFor("src/db/users.ts", [
          "const rows = await db.query(`select * from users where id = ${userId}`);",
        ]),
      ).map((finding) => finding.ruleId),
    ).toEqual(["sql-string-concat"]);

    expect(
      runReviewRules(
        diffFor("src/db/users.ts", [
          'const rows = await db.query("select * from users where id = ?", [userId]);',
        ]),
      ),
    ).toEqual([]);
  });

  it("acusa service role no cliente e ignora no servidor", () => {
    expect(
      runReviewRules(
        diffFor("src/lib/admin.ts", [
          "const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);",
        ]),
      ).map((finding) => finding.ruleId),
    ).toEqual(["supabase-service-role-in-client"]);

    expect(
      runReviewRules(
        diffFor("supabase/functions/admin/index.ts", [
          "const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);",
        ]),
      ),
    ).toEqual([]);
  });

  it("acusa segredo em variável pública e não uma URL pública comum", () => {
    expect(
      runReviewRules(
        diffFor("src/env.ts", [
          "const key = import.meta.env.VITE_STRIPE_API_KEY;",
        ]),
      ).map((finding) => finding.ruleId),
    ).toEqual(["public-secret-exposure"]);

    expect(
      runReviewRules(
        diffFor("src/env.ts", ["const url = import.meta.env.VITE_API_URL;"]),
      ),
    ).toEqual([]);
  });

  it("acusa segredo literal e não o valor lido do ambiente", () => {
    expect(
      runReviewRules(
        diffFor("src/stripe.ts", [
          'const api_key = "abcd1234abcd1234abcd1234";',
        ]),
      ).map((finding) => finding.ruleId),
    ).toEqual(["secret-committed"]);

    expect(
      runReviewRules(
        diffFor("src/stripe.ts", [
          "const api_key = process.env.STRIPE_API_KEY;",
        ]),
      ),
    ).toEqual([]);
  });
});

describe("findTablesMissingRls", () => {
  it("acusa tabela nova sem RLS no mesmo diff", () => {
    const findings = findTablesMissingRls(
      diffFor("supabase/migrations/001.sql", [
        "create table public.profiles (id uuid primary key);",
      ]),
    );

    expect(findings.map((finding) => finding.ruleId)).toEqual([
      "table-without-rls",
    ]);
  });

  it("fica quieto quando o mesmo diff habilita RLS", () => {
    const diff = diffFor("supabase/migrations/001.sql", [
      "create table public.profiles (id uuid primary key);",
      "alter table public.profiles enable row level security;",
    ]);

    expect(runReviewRules(diff)).toEqual([]);
  });
});

describe("placar do ruleset (REQ-29)", () => {
  // Defeitos plantados de propósito: é a régua que impede o ruleset de
  // "melhorar" por impressão em vez de por número.
  const planted: Array<{ ruleId: string; diff: string }> = [
    {
      ruleId: "xss-unsafe-html",
      diff: diffFor("src/App.tsx", ["dangerouslySetInnerHTML={{ __html }}"]),
    },
    {
      ruleId: "sql-string-concat",
      diff: diffFor("src/db.ts", [
        'const q = "select * from a where b = " + value;',
      ]),
    },
    {
      ruleId: "supabase-service-role-in-client",
      diff: diffFor("src/admin.ts", ["use(SUPABASE_SERVICE_ROLE_KEY)"]),
    },
    {
      ruleId: "public-secret-exposure",
      diff: diffFor("src/env.ts", [
        "const t = import.meta.env.VITE_API_TOKEN;",
      ]),
    },
    {
      ruleId: "secret-committed",
      diff: diffFor("src/cfg.ts", ['const password = "sup3rs3cretvalue123";']),
    },
    {
      ruleId: "table-without-rls",
      diff: diffFor("supabase/migrations/001.sql", [
        "create table public.tasks (id uuid primary key);",
      ]),
    },
  ];

  it("encontra todos os defeitos plantados (recall 100%)", () => {
    const missed: string[] = [];
    for (const { ruleId, diff } of planted) {
      const found = runReviewRules(diff).some(
        (finding) => finding.ruleId === ruleId,
      );
      if (!found) missed.push(ruleId);
    }

    expect(missed).toEqual([]);
  });

  it("não acusa nada num diff realista e limpo", () => {
    const clean = [
      diffFor("src/App.tsx", [
        "const items = rows.map((row) => <li key={row.id}>{row.name}</li>);",
      ]),
      diffFor("src/env.ts", ["const url = import.meta.env.VITE_API_URL;"]),
      diffFor("src/db/users.ts", [
        'const rows = await db.query("select * from users where id = ?", [id]);',
      ]),
      diffFor("supabase/migrations/002.sql", [
        "create table public.notes (id uuid primary key);",
        "alter table public.notes enable row level security;",
      ]),
    ].join("\n");

    expect(runReviewRules(clean)).toEqual([]);
  });
});
