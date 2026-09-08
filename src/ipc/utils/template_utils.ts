import { cachedTeamTemplates } from "../services/project_templates/store";
import { type Template, localTemplatesData } from "../../shared/templates";

// In-memory cache for API templates
let apiTemplatesCache: Template[] | null = null;
let apiTemplatesFetchPromise: Promise<Template[]> | null = null;

// (convertApiTemplate removido — sem templates remotos da API do Dyad)

// Fetch templates from API with caching
export async function fetchApiTemplates(): Promise<Template[]> {
  // Return cached data if available
  if (apiTemplatesCache) {
    return apiTemplatesCache;
  }

  // Return existing promise if fetch is already in progress
  if (apiTemplatesFetchPromise) {
    return apiTemplatesFetchPromise;
  }

  // Start new fetch
  apiTemplatesFetchPromise = (async (): Promise<Template[]> => {
    // Samba Builder: zero backend do Dyad — os templates remotos
    // (api.dyad.sh/v1/templates) não são buscados; só templates locais.
    return [];
  })();

  return apiTemplatesFetchPromise;
}

// Get all templates (local + API)
export async function getAllTemplates(): Promise<Template[]> {
  const apiTemplates = await fetchApiTemplates();
  return [
    ...localTemplatesData,
    ...apiTemplates,
    ...(await cachedTeamTemplates()),
  ];
}

export async function getTemplateOrThrow(
  templateId: string,
): Promise<Template> {
  const allTemplates = await getAllTemplates();
  const template = allTemplates.find((template) => template.id === templateId);
  if (!template) {
    throw new Error(
      `Template ${templateId} not found. Please select a different template.`,
    );
  }
  return template;
}
