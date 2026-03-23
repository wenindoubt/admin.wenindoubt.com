import { Activity, DollarSign, TrendingUp, Users } from "lucide-react";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getLeadStats } from "@/lib/actions/leads";
import { LEAD_STATUSES } from "@/lib/constants";

const kpiConfig = [
  { key: "leads", label: "Total Leads", icon: Users, prefix: "" },
  { key: "active", label: "Active Pipeline", icon: DollarSign, prefix: "$" },
  { key: "total", label: "Total Pipeline", icon: TrendingUp, prefix: "$" },
  { key: "won", label: "Won Deals", icon: Activity, prefix: "" },
] as const;

async function DashboardContent() {
  const stats = await getLeadStats();

  const totalPipelineValue = stats.pipelineValues.reduce(
    (sum, pv) => sum + Number(pv.total),
    0,
  );

  const activeStatuses = [
    "new",
    "contacted",
    "qualifying",
    "proposal_sent",
    "negotiating",
  ];
  const activePipelineValue = stats.pipelineValues
    .filter((pv) => activeStatuses.includes(pv.status))
    .reduce((sum, pv) => sum + Number(pv.total), 0);

  const wonCount =
    stats.statusCounts.find((s) => s.status === "won")?.count ?? 0;

  const kpiValues = {
    leads: stats.totalLeads.toString(),
    active: activePipelineValue.toLocaleString(),
    total: totalPipelineValue.toLocaleString(),
    won: wonCount.toString(),
  };

  // Calculate max count for pipeline bar widths
  const maxCount = Math.max(
    ...stats.statusCounts.map((sc) => Number(sc.count)),
    1,
  );

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiConfig.map((kpi, i) => (
          <Card
            key={kpi.key}
            className={`card-hover animate-fade-up stagger-${i + 1} relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gold-400/[0.03] to-transparent pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <kpi.icon className="size-4 text-gold-400/60" />
            </CardHeader>
            <CardContent>
              <p className="font-heading text-3xl font-bold tracking-tight">
                {kpi.prefix}
                {kpiValues[kpi.key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline by Status */}
        <Card className="animate-fade-up stagger-5">
          <CardHeader>
            <CardTitle className="gold-underline pb-1 text-lg">
              Pipeline by Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {LEAD_STATUSES.map((s) => {
                const count = Number(
                  stats.statusCounts.find((sc) => sc.status === s.value)
                    ?.count ?? 0,
                );
                const value =
                  stats.pipelineValues.find((pv) => pv.status === s.value)
                    ?.total ?? "0";
                const barWidth = (count / maxCount) * 100;
                // Extract the accent color from the status config
                const barColor = s.color
                  .split(" ")[0]
                  .replace("bg-", "bg-")
                  .replace("/15", "/30");
                return (
                  <div key={s.value} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={s.color}>
                          {s.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {count} lead{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-sm font-medium font-heading tabular-nums">
                        ${Number(value).toLocaleString()}
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 w-full rounded-full bg-muted/50">
                      <div
                        className={`h-full rounded-full ${barColor} transition-all duration-500`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card className="animate-fade-up stagger-6">
          <CardHeader>
            <CardTitle className="gold-underline pb-1 text-lg">
              Leads by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.sourceCounts.map((sc) => (
                <div
                  key={sc.source}
                  className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                >
                  <span className="text-sm capitalize text-muted-foreground">
                    {sc.source.replace("_", " ")}
                  </span>
                  <span className="text-sm font-heading font-semibold tabular-nums">
                    {sc.count}
                  </span>
                </div>
              ))}
              {stats.sourceCounts.length === 0 && (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="animate-fade-up stagger-7">
        <CardHeader>
          <CardTitle className="gold-underline pb-1 text-lg">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {stats.recentActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            )}
            {stats.recentActivities.map(
              ({ activity, leadFirstName, leadLastName }, i) => (
                <div
                  key={activity.id}
                  className="relative flex items-start gap-4 py-3 text-sm"
                >
                  {/* Vertical connector line */}
                  {i < stats.recentActivities.length - 1 && (
                    <div className="absolute left-3 top-9 bottom-0 w-px bg-border/50" />
                  )}
                  {/* Activity type icon */}
                  <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-400/10 text-[10px] font-bold uppercase text-gold-400 ring-1 ring-gold-400/20">
                    {activity.type[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate">
                      <span className="font-medium text-foreground">
                        {leadFirstName} {leadLastName}
                      </span>{" "}
                      <span className="text-muted-foreground">&mdash;</span>{" "}
                      <span className="text-muted-foreground">
                        {activity.description}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      {new Date(activity.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-end gap-3">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Dashboard
        </h1>
        <div className="mb-1 h-px flex-1 bg-gradient-to-r from-border to-transparent" />
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
