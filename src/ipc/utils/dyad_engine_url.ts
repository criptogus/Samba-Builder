export function getDyadEngineBaseUrl(): string {
  // Samba Builder: zero backend do Dyad — sem URL de engine. Se algo tentar
  // criar o engine (fluxo morto), falha localmente em vez de falar com o Dyad.
  return process.env.DYAD_ENGINE_URL ?? "";
}
