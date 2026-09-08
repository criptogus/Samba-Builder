import { afterEach, describe, expect, it } from "vitest";

import { getSambaEngineBaseUrl } from "./samba_engine_url";
import { getLmStudioBaseUrl } from "./lm_studio_utils";

const originalSambaEngineUrl = process.env.SAMBA_ENGINE_URL;
const originalLmStudioUrl = process.env.LM_STUDIO_BASE_URL_FOR_TESTING;

describe("call-time model service URLs", () => {
  afterEach(() => {
    if (originalSambaEngineUrl === undefined) {
      delete process.env.SAMBA_ENGINE_URL;
    } else {
      process.env.SAMBA_ENGINE_URL = originalSambaEngineUrl;
    }
    if (originalLmStudioUrl === undefined) {
      delete process.env.LM_STUDIO_BASE_URL_FOR_TESTING;
    } else {
      process.env.LM_STUDIO_BASE_URL_FOR_TESTING = originalLmStudioUrl;
    }
  });

  it("reads SAMBA_ENGINE_URL when called", () => {
    delete process.env.SAMBA_ENGINE_URL;
    expect(getSambaEngineBaseUrl()).toBe("https://engine.samba.sh/v1");

    process.env.SAMBA_ENGINE_URL = "http://127.0.0.1:4321/v1";
    expect(getSambaEngineBaseUrl()).toBe("http://127.0.0.1:4321/v1");
  });

  it("reads LM_STUDIO_BASE_URL_FOR_TESTING when called", () => {
    delete process.env.LM_STUDIO_BASE_URL_FOR_TESTING;
    expect(getLmStudioBaseUrl()).toBe("http://localhost:1234");

    process.env.LM_STUDIO_BASE_URL_FOR_TESTING = "http://127.0.0.1:9876";
    expect(getLmStudioBaseUrl()).toBe("http://127.0.0.1:9876");
  });
});
