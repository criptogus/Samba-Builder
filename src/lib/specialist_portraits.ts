import architect from "../../assets/specialists/architect.webp";
import cybersec from "../../assets/specialists/cybersec.webp";
import uxUi from "../../assets/specialists/ux-ui.webp";
import quality from "../../assets/specialists/quality.webp";
import performance from "../../assets/specialists/performance.webp";
import enterprise from "../../assets/specialists/enterprise.webp";
import pm from "../../assets/specialists/pm.webp";
import reviewer from "../../assets/specialists/reviewer.webp";
import mobile from "../../assets/specialists/mobile.webp";
import devops from "../../assets/specialists/devops.webp";

/** Retratos gerados (Grok) — chave = `SpecialistAgent.portrait`. */
export const specialistPortraits: Record<string, string> = {
  architect,
  cybersec,
  "ux-ui": uxUi,
  quality,
  performance,
  enterprise,
  pm,
  reviewer,
  mobile,
  devops,
};

export function specialistPortraitSrc(id: string): string | undefined {
  return specialistPortraits[id];
}
