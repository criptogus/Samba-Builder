import { z } from "zod";
const count = z.number().int().nonnegative();
const money = z.number().finite().min(0).max(1000000);
export const RateSchema = z.object({
  provider: z.string().min(1).max(150),
  model: z.string().min(1).max(200),
  inputPerMillion: money,
  outputPerMillion: money,
});
export const TimeEntrySchema = z.object({
  id: z.string().uuid(),
  sprintId: z.string().uuid().nullable(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine(
      (s) =>
        !Number.isNaN(Date.parse(s)) &&
        new Date(s).toISOString().slice(0, 10) === s,
    ),
  person: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(1000),
  minutes: z.number().int().min(1).max(1440),
  hourlyRate: money.nullable(),
});
export const TokenGroupSchema = z.object({
  provider: z.string(),
  model: z.string(),
  source: z.string(),
  inputTokens: count,
  outputTokens: count,
  calls: count,
  unknownCalls: count,
  estimatedCost: z.number().nonnegative().nullable(),
});
export const MetricsSchema = z.object({
  rates: z.array(RateSchema),
  deliveryStage: z.string(),
  approvalCommit: z.string(),
  capturedAt: count,
  commit: z.string(),
  codeLines: count,
  codeFiles: count,
  addedLines: count.nullable(),
  removedLines: count.nullable(),
  commits: count.nullable(),
  minutes: count,
  laborCost: z.number().nonnegative(),
  unpricedMinutes: count,
  tokens: z.array(TokenGroupSchema),
  features: z.array(
    z.object({ id: z.string(), title: z.string(), evidence: z.string() }),
  ),
  completedTasks: count,
});
export const SprintSchema = z.object({
  id: z.string().uuid(),
  name: z.string().trim().min(1).max(150),
  startedAt: count,
  endedAt: count.nullable(),
  baseCommit: z.string(),
  baselineDoneIds: z.array(z.string()),
  report: MetricsSchema.nullable(),
});
export const ManagementSchema = z.object({
  rates: z
    .array(RateSchema)
    .max(100)
    .refine(
      (a) =>
        new Set(a.map((r) => JSON.stringify([r.provider, r.model]))).size ===
        a.length,
      "Tarifa duplicada",
    ),
  timeEntries: z
    .array(TimeEntrySchema)
    .max(5000)
    .refine(
      (a) => new Set(a.map((t) => t.id)).size === a.length,
      "Apontamento duplicado",
    ),
  sprints: z.array(SprintSchema).max(200),
});
export type Management = z.infer<typeof ManagementSchema>;
export type Metrics = z.infer<typeof MetricsSchema>;
export type TokenGroup = z.infer<typeof TokenGroupSchema>;
export const emptyManagement = (): Management => ({
  rates: [],
  timeEntries: [],
  sprints: [],
});
export function priceTokens(
  groups: Omit<TokenGroup, "estimatedCost">[],
  rates: Management["rates"],
): TokenGroup[] {
  return groups.map((g) => {
    const rate = rates.find(
      (r) => r.provider === g.provider && r.model === g.model,
    );
    return {
      ...g,
      estimatedCost:
        rate && !g.unknownCalls
          ? (g.inputTokens * rate.inputPerMillion +
              g.outputTokens * rate.outputPerMillion) /
            1000000
          : null,
    };
  });
}
export function summarizeTime(entries: Management["timeEntries"]) {
  return entries.reduce(
    (a, e) => ({
      minutes: a.minutes + e.minutes,
      laborCost: a.laborCost + (e.minutes / 60) * (e.hourlyRate ?? 0),
      unpricedMinutes:
        a.unpricedMinutes + (e.hourlyRate === null ? e.minutes : 0),
    }),
    { minutes: 0, laborCost: 0, unpricedMinutes: 0 },
  );
}
