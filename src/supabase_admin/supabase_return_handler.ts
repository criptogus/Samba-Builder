import { readSettings, writeSettings } from "../main/settings";
import {
  listSupabaseOrganizations,
  type SupabaseOrganizationDetails,
} from "./supabase_management_client";
import { DyadError, DyadErrorKind } from "@/errors/dyad_error";
import log from "electron-log";

const logger = log.scope("supabase_return_handler");

export interface SupabaseOAuthReturnParams {
  token: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Handles OAuth return by storing organization credentials.
 * If exactly one organization is found, it's stored in the organizations map.
 * Otherwise, it falls back to legacy fields.
 */
export async function handleSupabaseOAuthReturn({
  token,
  refreshToken,
  expiresIn,
}: SupabaseOAuthReturnParams) {
  let orgs: any[] = [];
  let errorOccurred = false;

  try {
    orgs = await listSupabaseOrganizations(token);
  } catch (error) {
    logger.error("Error listing Supabase organizations:", error);
    errorOccurred = true;
  }

  // Re-read settings right before writing to avoid stale-read race conditions.
  // The async listSupabaseOrganizations call above may take time, during which
  // other org credentials could be written (e.g. token refreshes). Reading here
  // ensures we merge into the latest state.
  const settings = readSettings();

  if (!errorOccurred && orgs.length > 0) {
    if (orgs.length > 1) {
      logger.warn(
        "Multiple Supabase organizations found unexpectedly, using the first one",
      );
    }
    const organizationSlug = orgs[0].slug;
    const existingOrgs = settings.supabase?.organizations ?? {};

    writeSettings({
      supabase: {
        ...settings.supabase,
        organizations: {
          ...existingOrgs,
          [organizationSlug]: {
            accessToken: {
              value: token,
            },
            refreshToken: {
              value: refreshToken,
            },
            expiresIn,
            tokenTimestamp: Math.floor(Date.now() / 1000),
          },
        },
      },
    });
  } else {
    // Fallback to legacy fields
    writeSettings({
      supabase: {
        ...settings.supabase,
        accessToken: {
          value: token,
        },
        refreshToken: {
          value: refreshToken,
        },
        expiresIn,
        tokenTimestamp: Math.floor(Date.now() / 1000),
      },
    });
  }
}

/**
 * Direct connection to Supabase with a Personal Access Token (sb_pat_…).
 *
 * No Dyad OAuth proxy is involved. The PAT is validated against the Supabase
 * Management API and, for every organization the token can reach, stored as
 * that organization's credentials. A PAT is long-lived, so no refresh token or
 * expiry is persisted — the client's refresh path is a no-op for it.
 *
 * Returns the number of organizations connected so the caller can surface a
 * meaningful result.
 */
export async function connectSupabaseWithAccessToken(
  accessToken: string,
): Promise<{ organizations: number }> {
  const token = accessToken.trim();
  if (!token) {
    throw new DyadError(
      "Supabase access token is required.",
      DyadErrorKind.Validation,
    );
  }

  // Validates the token against the real Management API and discovers the
  // organizations it can reach.
  let orgs: SupabaseOrganizationDetails[];
  try {
    orgs = await listSupabaseOrganizations(token);
  } catch (error) {
    logger.error("Error validating Supabase access token:", error);
    throw new DyadError(
      "Couldn't validate the Supabase access token. Check that you pasted a valid Personal Access Token (sb_pat_…).",
      DyadErrorKind.Auth,
    );
  }

  if (orgs.length === 0) {
    throw new DyadError(
      "No Supabase organizations were found for this access token.",
      DyadErrorKind.Auth,
    );
  }

  // Re-read settings right before writing to merge into the latest state.
  const settings = readSettings();
  const existingOrgs = settings.supabase?.organizations ?? {};
  const organizations = { ...existingOrgs };
  for (const org of orgs) {
    organizations[org.slug] = {
      accessToken: { value: token },
    };
  }

  writeSettings({
    supabase: {
      ...settings.supabase,
      organizations,
    },
  });

  return { organizations: Object.keys(organizations).length };
}
