import { deliveryContracts } from "../types/delivery";
import { nativeAgentContracts } from "../types/native_agents";
import { meetingsContracts } from "../types/meetings";
import { awsContracts } from "../types/aws";
import { vercelContracts } from "../types/vercel";
import { describe, expect, it } from "vitest";
import { userInputContracts, userInputEvents } from "../types/user_input";
import { supabaseEvents } from "../types/supabase";
import { gitEvents } from "../types/github";
import {
  previewViewEvents,
  previewViewSendContracts,
} from "../types/preview_view";
import {
  coolifySetupContracts,
  coolifySetupEvents,
} from "../types/coolify_setup";
import {
  VALID_INVOKE_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  VALID_SEND_CHANNELS,
} from "./channels";

describe("user-input preload channels", () => {
  it("allows every user-input invoke and receive contract", () => {
    for (const contract of Object.values(userInputContracts)) {
      expect(VALID_INVOKE_CHANNELS).toContain(contract.channel);
    }
    for (const event of Object.values(userInputEvents)) {
      expect(VALID_RECEIVE_CHANNELS).toContain(event.channel);
    }
  });
});

describe("supabase preload channels", () => {
  it("allows every Supabase receive contract", () => {
    for (const event of Object.values(supabaseEvents)) {
      expect(VALID_RECEIVE_CHANNELS).toContain(event.channel);
    }
  });
});

describe("git preload channels", () => {
  it("allows every Git receive contract", () => {
    for (const event of Object.values(gitEvents)) {
      expect(VALID_RECEIVE_CHANNELS).toContain(event.channel);
    }
  });
});

describe("preview view preload channels", () => {
  it("allows every preview send and receive contract", () => {
    for (const contract of Object.values(previewViewSendContracts)) {
      expect(VALID_SEND_CHANNELS).toContain(contract.channel);
    }
    for (const event of Object.values(previewViewEvents)) {
      expect(VALID_RECEIVE_CHANNELS).toContain(event.channel);
    }
  });
});

describe("coolify-setup preload channels", () => {
  it("allows every Coolify setup invoke and receive contract", () => {
    // The preload's on() takes `ValidReceiveChannel | string`, so a channel
    // missing from the list compiles and fails only when the install runs —
    // which is minutes in, on a real server.
    for (const contract of Object.values(coolifySetupContracts)) {
      expect(VALID_INVOKE_CHANNELS).toContain(contract.channel);
    }
    for (const event of Object.values(coolifySetupEvents)) {
      expect(VALID_RECEIVE_CHANNELS).toContain(event.channel);
    }
  });
});

it("allows native AWS and Vercel publishing contracts", () => {
  for (const contract of [
    ...Object.values(awsContracts),
    ...Object.values(vercelContracts),
  ])
    expect(VALID_INVOKE_CHANNELS).toContain(contract.channel);
});

it("allows meeting import and cancellation through preload", () => {
  for (const contract of Object.values(meetingsContracts))
    expect(VALID_INVOKE_CHANNELS).toContain(contract.channel);
});

it("exposes the project template workflow channels", () => {
  expect(VALID_INVOKE_CHANNELS).toEqual(
    expect.arrayContaining([
      "templates:prepare-project",
      "templates:publish-project",
      "templates:discard-draft",
      "templates:sync-team",
    ]),
  );
});

it("allows native agent lifecycle contracts", () => {
  for (const contract of Object.values(nativeAgentContracts))
    expect(VALID_INVOKE_CHANNELS).toContain(contract.channel);
});

it("allows delivery contracts through preload", () => {
  for (const contract of Object.values(deliveryContracts))
    expect(VALID_INVOKE_CHANNELS).toContain(contract.channel);
});
