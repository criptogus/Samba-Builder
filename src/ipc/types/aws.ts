import { z } from "zod";
import { createClient, defineContract } from "../contracts/core";

const role = z.string().regex(/^arn:aws:iam::\d{12}:role\/[\w+=,.@/-]+$/);
export const AwsConfigSchema = z.object({
  profile: z
    .string()
    .regex(/^[\w.@+-]{1,128}$/)
    .default("default"),
  region: z
    .string()
    .regex(/^[a-z]{2}-[a-z]+-\d$/)
    .default("us-east-1"),
  serviceName: z.string().regex(/^[a-z][a-z0-9-]{2,49}$/),
  executionRoleArn: role,
  infrastructureRoleArn: role,
  port: z.number().int().min(1).max(65535).default(3000),
  healthCheckPath: z
    .string()
    .regex(/^\/[^\r\n\s]*$/)
    .max(200)
    .default("/"),
  secrets: z
    .array(
      z.object({
        name: z.string().regex(/^[A-Z_][A-Z0-9_]*$/),
        valueFrom: z
          .string()
          .regex(/^arn:aws:(secretsmanager|ssm):[a-z0-9-]+:\d{12}:[^\s]+$/),
      }),
    )
    .max(30)
    .default([]),
});
export type AwsConfig = z.infer<typeof AwsConfigSchema>;
export const AwsStateSchema = z.object({
  config: AwsConfigSchema,
  accountId: z.string(),
  phase: z.enum([
    "preparing",
    "building",
    "uploading",
    "deploying",
    "submitted",
    "failed",
    "interrupted",
  ]),
  message: z.string(),
  serviceArn: z.string().optional(),
  image: z.string().optional(),
  updatedAt: z.string(),
});
export type AwsState = z.infer<typeof AwsStateSchema>;
export const awsContracts = {
  status: defineContract({
    channel: "aws:status",
    input: z.object({ appId: z.number().int() }),
    output: AwsStateSchema.nullable(),
  }),
  review: defineContract({
    channel: "aws:review",
    input: z.object({ appId: z.number().int(), config: AwsConfigSchema }),
    output: z.object({
      accountId: z.string(),
      identity: z.string(),
      sourceFiles: z.number(),
      sourceBytes: z.number(),
      sourceDigest: z.string(),
    }),
  }),
  deploy: defineContract({
    channel: "aws:deploy",
    input: z.object({
      appId: z.number().int(),
      config: AwsConfigSchema,
      accountId: z.string().regex(/^\d{12}$/),
      sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
    }),
    output: AwsStateSchema,
  }),
  refresh: defineContract({
    channel: "aws:refresh",
    input: z.object({ appId: z.number().int() }),
    output: z.object({ status: z.string(), endpoints: z.array(z.string()) }),
  }),
} as const;
export const awsClient = createClient(awsContracts);
