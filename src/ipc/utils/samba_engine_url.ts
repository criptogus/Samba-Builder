export function getSambaEngineBaseUrl(): string {
  // Samba Builder: zero backend do Samba — sem URL de engine. Se algo tentar
  // criar o engine (fluxo morto), falha localmente em vez de falar com o Samba.
  return process.env.SAMBA_ENGINE_URL ?? "";
}
