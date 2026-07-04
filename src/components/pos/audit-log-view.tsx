import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTenantFetch } from "@/hooks/use-fetch";

interface AuditLogEntry {
  id: string;
  operatorName: string | null;
  ipAddress: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  description: string;
  success: boolean;
  errorMessage: string | null;
  createdAt: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  furs_fiscalize: { label: "FURS Fiskalizacija", color: "bg-blue-100 text-blue-800" },
  furs_storno: { label: "FURS Storno", color: "bg-orange-100 text-orange-800" },
  furs_ini: { label: "FURS INI", color: "bg-purple-100 text-purple-800" },
  payment: { label: "Placilo", color: "bg-green-100 text-green-800" },
  storno: { label: "Storno", color: "bg-red-100 text-red-800" },
  pin_change: { label: "PIN sprememba", color: "bg-yellow-100 text-yellow-800" },
  tenant_config: { label: "Tenant config", color: "bg-gray-100 text-gray-800" },
  operator_create: { label: "Operator ustvarjen", color: "bg-teal-100 text-teal-800" },
  operator_delete: { label: "Operator izbrisan", color: "bg-red-100 text-red-800" },
  inventory_adjust: { label: "Zaloga", color: "bg-indigo-100 text-indigo-800" },
  gift_card_redeem: { label: "Darilna kartica", color: "bg-pink-100 text-pink-800" },
  loyalty_redeem: { label: "Loyalty unovcitev", color: "bg-amber-100 text-amber-800" },
};

export function AuditLogView() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const { fetchWithHeaders } = useTenantFetch();

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = filter !== "all" ? `?action=${filter}` : "";
      const res = await fetchWithHeaders(`/api/audit-log${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (e) {
      console.error("Audit log load error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Audit Log (FURS sledljivost)
        </CardTitle>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
          Osvezi
        </Button>
      </CardHeader>
      <CardContent>
        {/* Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter("all")}
          >
            Vsi
          </Button>
          {Object.entries(ACTION_LABELS).slice(0, 6).map(([key, { label }]) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        {/* Logs */}
        <ScrollArea className="h-[500px] w-full rounded-md border">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">Nalagam...</div>
          ) : logs.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">Ni audit log vnosov</div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => {
                const actionInfo = ACTION_LABELS[log.action] || {
                  label: log.action,
                  color: "bg-gray-100 text-gray-800",
                };
                return (
                  <div key={log.id} className="p-3 hover:bg-muted/50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={actionInfo.color} variant="secondary">
                            {actionInfo.label}
                          </Badge>
                          {log.success ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <AlertCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <p className="text-sm font-medium truncate">{log.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span>{new Date(log.createdAt).toLocaleString("sl-SI")}</span>
                          {log.operatorName && <span>Operator: {log.operatorName}</span>}
                          {log.ipAddress && log.ipAddress !== "unknown" && (
                            <span>IP: {log.ipAddress}</span>
                          )}
                          {log.entityType && <span>Tip: {log.entityType}</span>}
                        </div>
                        {!log.success && log.errorMessage && (
                          <p className="text-xs text-red-600 mt-1">Napaka: {log.errorMessage}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
