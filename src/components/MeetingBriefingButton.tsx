import { lazy, Suspense, useState } from "react";
import { Button } from "@/components/ui/button";
const MeetingBriefingDialog = lazy(() => import("./MeetingBriefingDialog"));
export function MeetingBriefingButton({
  onPrepared,
}: {
  onPrepared: (prompt: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        Briefing de reunião
      </Button>
      {open && (
        <Suspense fallback={<span role="status">Abrindo importador...</span>}>
          <MeetingBriefingDialog
            onClose={() => setOpen(false)}
            onPrepared={onPrepared}
          />
        </Suspense>
      )}
    </>
  );
}
