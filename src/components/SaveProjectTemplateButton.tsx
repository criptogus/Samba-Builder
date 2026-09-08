import { lazy, Suspense, useState } from "react";
import { Button } from "./ui/button";
const SaveProjectTemplateDialog = lazy(
  () => import("./SaveProjectTemplateDialog"),
);
export function SaveProjectTemplateButton({
  appId,
  name,
}: {
  appId: number;
  name: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 justify-start text-xs"
        onClick={() => setOpen(true)}
      >
        Salvar como template
      </Button>
      {open && (
        <Suspense fallback={<span role="status">Abrindo...</span>}>
          <SaveProjectTemplateDialog
            key={appId}
            appId={appId}
            name={name}
            onClose={() => setOpen(false)}
          />
        </Suspense>
      )}
    </>
  );
}
