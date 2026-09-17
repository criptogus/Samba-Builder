import { DeliveryAttention } from "./DeliveryAttention";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Folder, Plus, Search, Star } from "lucide-react";
import { useLoadApps } from "@/hooks/useLoadApps";
import { useAppCollections } from "@/hooks/useAppCollections";
import { useOpenApp } from "@/hooks/useOpenApp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function DeliveryWorkspace() {
  const { t, i18n } = useTranslation("home");
  const { apps, loading, error, refreshApps } = useLoadApps();
  const { collections } = useAppCollections();
  const openApp = useOpenApp();
  const [search, setSearch] = useState("");
  const [favorites, setFavorites] = useState(false);
  const [limit, setLimit] = useState(6);
  const collectionNames = useMemo(
    () => new Map(collections.map((c) => [c.id, c.name])),
    [collections],
  );
  const filtered = useMemo(
    () =>
      apps
        .filter((app) => {
          const text = `${app.name} ${collectionNames.get(app.collectionId ?? -1) ?? ""}`;
          return (
            (!favorites || app.isFavorite) &&
            text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
          );
        })
        .sort(
          (a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime() ||
            b.id - a.id,
        ),
    [apps, favorites, search, collectionNames],
  );

  return (
    <section aria-labelledby="delivery-workspace-title" className="min-w-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
            Samba Builder · Software House
          </p>
          <h1
            id="delivery-workspace-title"
            className="text-2xl font-semibold tracking-tight"
          >
            {t("delivery.title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            {t("delivery.subtitle")}
          </p>
        </div>
        <a
          href="#project-intake"
          onClick={(e) => {
            // O hash muda mas o app não rola sozinho até a âncora (o layout
            // tem scroll próprio) — scroll explícito para o fluxo abrir.
            e.preventDefault();
            document
              .getElementById("project-intake")
              ?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="size-4" />
          {t("delivery.newProject")}
        </a>
      </div>
      <div className="mb-5 flex flex-wrap items-center gap-2 text-sm">
        <Link
          to="/apps"
          className="rounded-md border px-3 py-2 text-xs font-medium hover:bg-accent focus-visible:outline-2"
        >
          {t("delivery.allAppsAndCollections")}
        </Link>
        <Link
          to="/templates"
          className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2"
        >
          {t("delivery.templates")}
        </Link>
        <Link
          to="/library"
          className="rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2"
        >
          {t("delivery.library")}
        </Link>
      </div>
      <DeliveryAttention apps={apps} />
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="flex flex-wrap items-center gap-3 border-b p-4">
          <h2 className="mr-auto text-sm font-semibold">
            {t("delivery.projects")}{" "}
            <span className="ml-1 text-muted-foreground">{apps.length}</span>
          </h2>
          <div className="relative min-w-0 flex-1 sm:max-w-64">
            <Search
              aria-hidden="true"
              className="absolute left-3 top-2.5 size-4 text-muted-foreground"
            />
            <Input
              aria-label={t("delivery.search")}
              placeholder={t("delivery.search")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setLimit(6);
              }}
              className="pl-9"
            />
          </div>
          <Button
            variant={favorites ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={favorites}
            onClick={() => {
              setFavorites(!favorites);
              setLimit(6);
            }}
          >
            <Star className="size-4" />
            {t("delivery.favorites")}
          </Button>
        </div>
        {loading ? (
          <p role="status" className="p-6 text-sm text-muted-foreground">
            {t("delivery.loading")}
          </p>
        ) : error ? (
          <div role="alert" className="p-6">
            <p className="mb-3 text-sm">{t("delivery.error")}</p>
            <Button variant="outline" onClick={() => void refreshApps()}>
              {t("delivery.retry")}
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <Folder className="mx-auto mb-3 size-6 text-primary" />
            <p className="text-sm font-medium">
              {t(apps.length ? "delivery.noResults" : "delivery.empty")}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {t(apps.length ? "delivery.filterHint" : "delivery.emptyHint")}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.slice(0, limit).map((app) => (
              <li key={app.id}>
                <button
                  type="button"
                  onClick={() => openApp(app.id)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-primary"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">
                    <Folder className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {app.name}
                    </span>
                    <span className="mt-1 block truncate text-xs text-muted-foreground">
                      {collectionNames.get(app.collectionId ?? -1) ??
                        t("delivery.ungrouped")}
                    </span>
                  </span>
                  {app.isFavorite && (
                    <Star
                      aria-label={t("delivery.favorites")}
                      className="size-3.5 shrink-0 fill-primary text-primary"
                    />
                  )}
                  <span className="hidden text-right text-xs text-muted-foreground sm:block">
                    {t("delivery.updated")}
                    <time
                      className="mt-1 block"
                      dateTime={new Date(app.updatedAt).toISOString()}
                    >
                      {new Intl.DateTimeFormat(i18n.language, {
                        dateStyle: "medium",
                      }).format(new Date(app.updatedAt))}
                    </time>
                  </span>
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-muted-foreground group-hover:text-primary"
                  />
                </button>
              </li>
            ))}
          </ul>
        )}
        {!loading && !error && filtered.length > limit && (
          <div className="border-t p-3 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLimit(limit + 12)}
            >
              {t("delivery.more")}
            </Button>
          </div>
        )}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        {t("delivery.localHint")}
      </p>
    </section>
  );
}
