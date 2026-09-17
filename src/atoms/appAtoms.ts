import { atom } from "jotai";

export const selectedAppIdAtom = atom<number | null>(null);
export type PreviewMode =
  | "pm"
  | "preview"
  | "code"
  | "problems"
  | "configure"
  | "publish"
  | "security"
  | "tests"
  | "plan";

export const previewModeAtom = atom<PreviewMode>("preview");
