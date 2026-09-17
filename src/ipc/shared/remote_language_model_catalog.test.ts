import { afterEach, describe, expect, it, vi } from "vitest";
import { getBuiltinLanguageModelCatalog } from "./remote_language_model_catalog";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("remote language model catalog", () => {
  it("serves the builtin fallback catalog without contacting a remote server", async () => {
    // Zero backend do Samba: nenhuma URL remota de catálogo é configurada, então
    // o fetch nunca deve acontecer e o builtin local (MODEL_OPTIONS) é servido.
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          version: "test",
          expiresAt: "2099-01-01T00:00:00.000Z",
          providers: [],
          modelsByProvider: {
            auto: [
              {
                apiName: "remote-auto",
                displayName: "Remote Auto",
                description: "The remotely configured Auto option",
              },
            ],
          },
          aliases: [],
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const catalog = await getBuiltinLanguageModelCatalog();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(catalog.source).toBe("fallback");
    expect(catalog.modelsByProvider.auto).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ apiName: "balanced" }),
      ]),
    );
  });
});
