/**
 * Samba Builder — client local da Supabase Management API.
 *
 * Client próprio (sem dependência externa): mesma superfície usada pelo app
 * (getProjects/deleteFunction/runQuery/getSecrets + SupabaseManagementAPIError),
 * falando direto com https://api.supabase.com usando o access token (PAT) do
 * usuário.
 */

export const SUPABASE_API_URL = "https://api.supabase.com";

export class SupabaseManagementAPIError extends Error {
  response: Response;

  constructor(message: string, response: Response) {
    super(message);
    this.response = response;
  }
}

export type SupabaseProjectSummary = {
  id: string;
  name: string;
  region: string;
  organization_id: string;
  status?: string;
  [key: string]: unknown;
};

type ManagementAPIOptions = {
  accessToken: string;
  baseUrl?: string;
};

export class SupabaseManagementAPI {
  // Acesso compatível com o consumidor interno: o client lê
  // `(supabase as any).options.accessToken`.
  readonly options: { accessToken: string; baseUrl?: string };

  constructor(options: ManagementAPIOptions) {
    this.options = {
      accessToken: options.accessToken,
      baseUrl: (options.baseUrl ?? SUPABASE_API_URL).replace(/\/+$/, ""),
    };
  }

  private get baseUrl(): string {
    return this.options.baseUrl ?? SUPABASE_API_URL;
  }

  private async request(
    method: "GET" | "POST" | "DELETE",
    path: string,
    body?: unknown,
  ): Promise<unknown> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.options.accessToken}`,
          "Content-Type": "application/json",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (error) {
      throw new SupabaseManagementAPIError(
        error instanceof Error ? error.message : String(error),
        new Response(null, { status: 0 }),
      );
    }

    if (!response.ok) {
      let message = `Supabase Management API error (${response.status})`;
      try {
        const payload = (await response.json()) as { message?: string };
        if (payload.message) {
          message = payload.message;
        }
      } catch {
        // corpo não-JSON: mantém a mensagem genérica com o status
      }
      throw new SupabaseManagementAPIError(message, response);
    }

    if (response.status === 204) {
      return null;
    }
    return (await response.json()) as unknown;
  }

  async getProjects(): Promise<Array<SupabaseProjectSummary>> {
    return (await this.request(
      "GET",
      "/v1/projects",
    )) as Array<SupabaseProjectSummary>;
  }

  async deleteFunction(ref: string, slug: string): Promise<void> {
    await this.request(
      "DELETE",
      `/v1/projects/${encodeURIComponent(ref)}/functions/${encodeURIComponent(slug)}`,
    );
  }

  async getSecrets(
    ref: string,
  ): Promise<Array<{ name: string; value?: string | null }>> {
    return (await this.request(
      "GET",
      `/v1/projects/${encodeURIComponent(ref)}/secrets`,
    )) as Array<{ name: string; value?: string | null }>;
  }

  async runQuery(ref: string, query: string): Promise<unknown> {
    return await this.request(
      "POST",
      `/v1/projects/${encodeURIComponent(ref)}/database/query`,
      { query },
    );
  }
}
