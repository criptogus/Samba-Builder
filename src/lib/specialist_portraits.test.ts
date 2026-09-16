import { describe, expect, it } from "vitest";
import { specialistAgents } from "./specialist_agents";
import {
  specialistPortraitSrc,
  specialistPortraits,
} from "./specialist_portraits";

describe("specialist portraits", () => {
  it("todo especialista tem um retrato ilustrado mapeado", () => {
    for (const agent of specialistAgents) {
      const src = specialistPortraitSrc(agent.portrait);
      expect(src, `${agent.id} sem retrato`).toBeTruthy();
      expect(typeof src).toBe("string");
    }
  });

  it("não sobra retrato órfão no mapa", () => {
    const ids = new Set(specialistAgents.map((a) => a.portrait));
    for (const key of Object.keys(specialistPortraits)) {
      expect(ids.has(key), `retrato órfão: ${key}`).toBe(true);
    }
  });
});
