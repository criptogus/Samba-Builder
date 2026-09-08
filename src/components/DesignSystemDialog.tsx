import { useCallback, useEffect, useState } from "react";
import { Loader2, Palette, RefreshCw } from "lucide-react";
import { ipc } from "@/ipc/types";
import type { DesignSystemTemplate } from "@/ipc/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function errorMessage(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  // The CLI error envelope is wrapped by Electron with a verbose prefix.
  return m.replace(/^Error invoking remote method '[^']+': Error: /, "").trim();
}

/**
 * The body of the Design System dialog: lists the design systems saved via the
 * Design System Toolkit (`samba/design-system/design.py`), lets the user
 * extract the current app's design system into a new saved template, and apply
 * a saved template back onto the current app.
 *
 * Kept separate from the dialog shell so it can be unit-tested without a
 * portal/animation host.
 */
export function DesignSystemPanelContent({ appId }: { appId: number }) {
  const [templates, setTemplates] = useState<DesignSystemTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [extractName, setExtractName] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [applyingSlug, setApplyingSlug] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      const result = await ipc.designSystem.listTemplates();
      setTemplates(result.templates);
    } catch (err) {
      setListError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleExtract = async () => {
    const name = extractName.trim();
    if (!name) return;
    setExtracting(true);
    setFeedback(null);
    try {
      await ipc.designSystem.extractTemplate({ appId, name });
      setExtractName("");
      setFeedback({
        kind: "success",
        message: `Saved "${name}" as a design system template.`,
      });
      await refresh();
    } catch (err) {
      setFeedback({ kind: "error", message: errorMessage(err) });
    } finally {
      setExtracting(false);
    }
  };

  const handleApply = async (template: DesignSystemTemplate) => {
    setApplyingSlug(template.slug);
    setFeedback(null);
    try {
      const result = await ipc.designSystem.applyTemplate({
        appId,
        slug: template.slug,
      });
      setFeedback({
        kind: "success",
        message: `Applied "${template.name}" to this project${result.appliedPath ? ` (${result.appliedPath})` : ""}.`,
      });
    } catch (err) {
      setFeedback({ kind: "error", message: errorMessage(err) });
    } finally {
      setApplyingSlug(null);
    }
  };

  return (
    <div className="flex flex-col gap-4" data-testid="design-system-panel">
      {/* Extract current app's design system */}
      <div className="rounded-lg border border-border p-3">
        <Label
          htmlFor="design-system-extract-name"
          className="mb-1.5 block text-sm font-medium"
        >
          Extract this project&apos;s design system
        </Label>
        <p className="mb-2 text-xs text-muted-foreground">
          Reads your globals.css, tailwind config and components.json and saves
          them as a reusable template.
        </p>
        <div className="flex gap-2">
          <Input
            id="design-system-extract-name"
            value={extractName}
            onChange={(e) => setExtractName(e.target.value)}
            placeholder="Name for this design system"
            disabled={extracting}
            onKeyDown={(e) => {
              if (e.key === "Enter") void handleExtract();
            }}
          />
          <Button
            onClick={() => void handleExtract()}
            disabled={extracting || !extractName.trim()}
            size="sm"
            className="shrink-0"
          >
            {extracting ? (
              <Loader2 className="mr-1 animate-spin" />
            ) : (
              <Palette className="mr-1" />
            )}
            {extracting ? "Saving…" : "Extract"}
          </Button>
        </div>
      </div>

      {/* Saved templates */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Saved design systems</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refresh()}
            disabled={loading}
            aria-label="Refresh design systems"
            className="h-7 px-2 text-xs"
          >
            <RefreshCw className={loading ? "animate-spin" : undefined} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading templates…
          </div>
        ) : listError ? (
          <p className="text-sm text-destructive">{listError}</p>
        ) : templates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No saved design systems yet. Extract one from this project to get
            started.
          </p>
        ) : (
          <ul className="flex flex-col gap-2" data-testid="design-system-list">
            {templates.map((template) => {
              const applying = applyingSlug === template.slug;
              return (
                <li
                  key={template.slug}
                  className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {template.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[
                        template.from && `from ${template.from}`,
                        ...template.tags,
                      ]
                        .filter(Boolean)
                        .join(" · ") || template.slug}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={applying || applyingSlug !== null}
                    onClick={() => void handleApply(template)}
                    className="shrink-0"
                  >
                    {applying && (
                      <Loader2 className="animate-spin" aria-hidden="true" />
                    )}
                    {applying ? "Applying…" : "Apply"}
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {feedback && (
        <p
          role="status"
          data-testid="design-system-feedback"
          className={`text-sm ${
            feedback.kind === "success" ? "text-foreground" : "text-destructive"
          }`}
        >
          {feedback.kind === "success" ? "✓ " : "✕ "}
          {feedback.message}
        </p>
      )}
    </div>
  );
}

/**
 * Self-contained dialog (with trigger) exposing the Design System Toolkit UI
 * for a given app/project. Mount it wherever per-project tooling is surfaced.
 */
export function DesignSystemDialog({ appId }: { appId: number }) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            data-testid="design-system-dialog-trigger"
          >
            <Palette className="h-4 w-4" />
            Design system
          </Button>
        }
      />
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Design System Toolkit</DialogTitle>
          <DialogDescription>
            Save this project&apos;s visual design as a reusable template, or
            apply a saved design system to this project.
          </DialogDescription>
        </DialogHeader>
        <DesignSystemPanelContent appId={appId} />
      </DialogContent>
    </Dialog>
  );
}
