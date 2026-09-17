// Migrated from e2e-tests/supabase_stale_ui.spec.ts.
//
// The regression was stale app state in the Supabase connector: after linking
// app A to Supabase, opening Supabase setup for app B must not keep rendering
// app A's connected-project card.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.hoisted(() => {
  process.env.E2E_TEST_BUILD = "true";
});

import { act, screen, waitFor } from "@testing-library/react";
import fs from "node:fs";
import path from "node:path";

import {
  setupHybridChatHarness,
  type HybridChatHarness,
} from "@/testing/hybrid_chat_harness";
import { h } from "@/testing/hybrid.setup";
import { db } from "@/db";
import { apps, chats } from "@/db/schema";
import { eq } from "drizzle-orm";

describe("supabase stale app details UI (integration)", () => {
  let harness: HybridChatHarness;
  let secondAppId: number;

  beforeAll(async () => {
    harness = await setupHybridChatHarness({
      electronMock: h,
      engine: true,
      testBuild: true,
      settings: {
        isTestMode: true,
        // The connector now links projects through a Supabase Personal Access
        // Token (no Samba OAuth proxy). Validating a token hits the live
        // Management API, which this harness does not serve, so the org
        // credentials are seeded here and the app-to-project link below stands
        // in for the connect action.
        supabase: {
          organizations: {
            "fake-org": { accessToken: { value: "sb_pat_fake" } },
          },
        },
      },
    });

    const secondAppPath = path.join(path.dirname(harness.appDir), "second-app");
    fs.cpSync(harness.appDir, secondAppPath, { recursive: true });
    const [secondApp] = await db
      .insert(apps)
      .values({ name: "supabase-stale-second", path: secondAppPath })
      .returning();
    secondAppId = secondApp.id;
    await db.insert(chats).values({ appId: secondAppId });
  }, 60_000);

  afterAll(async () => {
    await harness?.dispose();
  });

  it("does not show a previously connected Supabase project for another app", async () => {
    // Link app A before mounting (the connect UI path needs the live Supabase
    // Management API, absent here). This is the state the regression is about:
    // app A is connected, app B is not.
    await db
      .update(apps)
      .set({
        supabaseProjectId: "fake-project-id",
        supabaseOrganizationSlug: "fake-org",
      })
      .where(eq(apps.id, harness.appId));

    harness.mountSurface({
      route: "/app-details",
      search: { provider: "supabase" },
    });

    await screen.findByTestId("app-details-page");
    expect(screen.getByText("minimal")).toBeTruthy();
    await waitFor(() => {
      expect(harness.bridge.lastInvoke("get-user-settings")?.status).toBe(
        "fulfilled",
      );
    });
    await harness.bridge.settleInFlight();

    await waitFor(
      () => {
        expect(screen.getByText("Fake Supabase Project")).toBeTruthy();
        expect(screen.getByText("Database Branch")).toBeTruthy();
      },
      { timeout: 15_000 },
    );

    const firstApp = await db.query.apps.findFirst({
      where: eq(apps.id, harness.appId),
    });
    expect(firstApp?.supabaseProjectId).toBe("fake-project-id");

    await act(async () => {
      await harness.router().navigate({
        to: "/app-details",
        search: { appId: secondAppId, provider: "supabase" },
      });
    });

    await waitFor(
      () => {
        expect(screen.getByText("supabase-stale-second")).toBeTruthy();
      },
      { timeout: 15_000 },
    );

    const newApp = await db.query.apps.findFirst({
      where: eq(apps.id, secondAppId),
    });
    expect(newApp?.supabaseProjectId).toBeNull();

    await waitFor(() => {
      expect(screen.queryByText("Fake Supabase Project")).toBeNull();
      expect(screen.queryByText("Database Branch")).toBeNull();
    });
    expect([...harness.bridge.missingChannels]).toEqual([]);
  }, 60_000);
});
