import { getActiveWindowSessionId } from "@/window_infrastructure/chat_tab_session_storage";
import { lazy, Suspense, useState } from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
const ProductCoachDialog = lazy(() => import("./ProductCoachDialog"));
export function ProductCoachButton({
  draftKey,
  idea,
  onPrepared,
  disabled = false,
}: {
  draftKey: string;
  idea: string;
  onPrepared: (brief: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Compass className="size-4" />
        Planejar com PM
      </Button>
      {open && (
        <Suspense
          fallback={<span role="status">Abrindo descoberta guiada...</span>}
        >
          <ProductCoachDialog
            key={draftKey}
            draftKey={`${getActiveWindowSessionId()}:${draftKey}`}
            idea={idea}
            onClose={() => setOpen(false)}
            onPrepared={onPrepared}
          />
        </Suspense>
      )}
    </>
  );
}
