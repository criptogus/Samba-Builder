import { ModelSelectionSchema, type ModelSelection } from "@/lib/schemas";

/** Explicit chat choices take precedence; Auto retains the persona defaults. */
export function selectSubagentModel(
  chatSelection: unknown,
  fallback: ModelSelection,
): ModelSelection {
  const parsed = ModelSelectionSchema.safeParse(chatSelection);
  if (
    parsed.success &&
    parsed.data.provider.toLowerCase() !== "auto" &&
    parsed.data.name.toLowerCase() !== "auto"
  )
    return parsed.data;
  return fallback;
}
