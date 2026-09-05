import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
const NativeAgentsDialog = lazy(() => import("./NativeAgentsDialog"));
export function NativeAgentsButton({ appId }: { appId: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Agentes locais
      </Button>
      {open && (
        <Suspense fallback={<span role="status">Abrindo agentes...</span>}>
          <NativeAgentsDialog appId={appId} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
