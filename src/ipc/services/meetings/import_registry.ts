import { SambaError, SambaErrorKind } from "@/errors/samba_error";
export class MeetingImportRegistry {
  private active: { owner: number; id: string; abort: AbortController } | null =
    null;
  async run<T>(
    owner: number,
    id: string,
    work: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    if (this.active)
      throw new SambaError(
        "Já existe uma importação de áudio em andamento.",
        SambaErrorKind.Conflict,
      );
    const current = { owner, id, abort: new AbortController() };
    this.active = current;
    try {
      return await work(current.abort.signal);
    } finally {
      if (this.active === current) this.active = null;
    }
  }
  cancel(owner: number, id: string) {
    if (this.active?.owner === owner && this.active.id === id)
      this.active.abort.abort();
  }
}
