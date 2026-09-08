import { useQuery } from "@tanstack/react-query";
import { ipc } from "@/ipc/types";
import { deliveryAttention } from "@/delivery/model";
import { useOpenApp } from "@/hooks/useOpenApp";
import { Button } from "@/components/ui/button";
export function DeliveryAttention({
  apps,
}: {
  apps: { id: number; name: string }[];
}) {
  const query = useQuery({
    queryKey: ["delivery-attention"],
    queryFn: () => ipc.delivery.list(),
    refetchOnWindowFocus: true,
  });
  const openApp = useOpenApp();
  const date = new Date();
  const today = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const pending =
    query.data?.flatMap((record) => {
      const app = apps.find((a) => a.id === record.appId);
      const reasons = deliveryAttention(record.plan, today);
      return app && reasons.length
        ? [{ ...record, name: app.name, reasons }]
        : [];
    }) ?? [];
  if (query.error)
    return (
      <div role="alert" className="mb-5 rounded-xl border p-4 text-sm">
        Não foi possível verificar as pendências.{" "}
        <Button variant="ghost" size="sm" onClick={() => void query.refetch()}>
          Tentar novamente
        </Button>
      </div>
    );
  if (!pending.length) return null;
  return (
    <section
      aria-label="Precisa da sua atenção"
      className="mb-5 rounded-xl border border-primary/30 bg-primary/5 p-4"
    >
      <h2 className="mb-3 text-sm font-semibold">
        Precisa da sua atenção · {pending.length}
      </h2>
      <ul className="space-y-2">
        {pending.map((item) => (
          <li key={item.appId}>
            <button
              type="button"
              className="w-full rounded-lg px-2 py-2 text-left hover:bg-primary/10 focus-visible:outline-2 focus-visible:outline-primary"
              onClick={() => openApp(item.appId)}
            >
              <span className="block text-sm font-medium">{item.name}</span>
              <span className="block text-xs text-muted-foreground">
                {item.reasons.join(" · ")}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
