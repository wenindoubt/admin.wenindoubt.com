export const dynamic = "force-dynamic";

import { Activity, DollarSign, TrendingUp, Users } from "lucide-react";
import { Suspense } from "react";
import { Pagination } from "@/components/pagination";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDealStats, getRecentActivities } from "@/lib/actions/deals";
import { ACTIVE_STAGES, DEAL_SOURCES, DEAL_STAGES } from "@/lib/constants";
import { PAGE_SIZE_ACTIVITY } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";

const kpiConfig = [
  { key: "deals", label: "Total Deals", icon: Users, prefix: "" },
  { key: "active", label: "Active Pipeline", icon: DollarSign, prefix: "$" },
  { key: "total", label: "Total Pipeline", icon: TrendingUp, prefix: "$" },
  { key: "won", label: "Won Deals", icon: Activity, prefix: "" },
] as const;

type SearchParams = Promise<{ page?: string }>;

async function DashboardContent({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * PAGE_SIZE_ACTIVITY;

  const [stats, { data: recentActivities, total: activityTotal }] =
    await Promise.all([
      getDealStats(),
      getRecentActivities({ limit: PAGE_SIZE_ACTIVITY, offset }),
    ]);

  const totalPipelineValue = stats.pipelineValues.reduce(
    (sum, pv) => sum + Number(pv.total),
    0,
  );

  const activePipelineValue = stats.pipelineValues
    .filter((pv) => ACTIVE_STAGES.has(pv.stage))
    .reduce((sum, pv) => sum + Number(pv.total), 0);

  const wonCount = stats.stageCounts.find((s) => s.stage === "won")?.count ?? 0;

  const kpiValues = {
    deals: stats.totalDeals.toString(),
    active: activePipelineValue.toLocaleString(),
    total: totalPipelineValue.toLocaleString(),
    won: wonCount.toString(),
  };

  // Calculate max count for pipeline bar widths
  const maxCount = Math.max(
    ...stats.stageCounts.map((sc) => Number(sc.count)),
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
            <div className="absolute -top-8 -right-8 size-24 rounded-full bg-neon-400/[0.04] blur-2xl pointer-events-none" />
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[0.6rem] font-sans font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                {kpi.label}
              </CardTitle>
              <div className="flex items-center justify-center size-6 rounded-md bg-neon-400/[0.06]">
                <kpi.icon className="size-3 text-neon-500/70" />
              </div>
            </CardHeader>
            <CardContent>
              <p
                className={`text-2xl font-bold tracking-tight tabular-nums ${kpi.prefix === "$" ? "text-emerald-600" : ""}`}
              >
                {kpi.prefix}
                {kpiValues[kpi.key]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline by Stage */}
        <Card className="animate-fade-up stagger-5">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-lg">
              Pipeline by Stage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {DEAL_STAGES.map((s) => {
                const count = Number(
                  stats.stageCounts.find((sc) => sc.stage === s.value)?.count ??
                    0,
                );
                const value =
                  stats.pipelineValues.find((pv) => pv.stage === s.value)
                    ?.total ?? "0";
                const barWidth = (count / maxCount) * 100;
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
                          {count} deal{count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <span className="text-sm font-medium tabular-nums text-emerald-600">
                        {formatCurrency(value)}
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

        {/* Deals by Source */}
        <Card className="animate-fade-up stagger-6">
          <CardHeader>
            <CardTitle className="neon-underline pb-1 text-lg">
              Deals by Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.sourceCounts.map((sc) => (
                <div
                  key={sc.source}
                  className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0"
                >
                  <span className="text-sm text-muted-foreground">
                    {DEAL_SOURCES.find((s) => s.value === sc.source)?.label ??
                      sc.source}
                  </span>
                  <span className="text-sm font-semibold tabular-nums">
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
          <CardTitle className="neon-underline pb-1 text-lg">
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0">
            {recentActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            )}
            {recentActivities.map(({ activity, dealTitle, companyName }, i) => (
              <div
                key={activity.id}
                className="relative flex items-start gap-4 py-3 text-sm"
              >
                {/* Vertical connector line */}
                {i < recentActivities.length - 1 && (
                  <div className="absolute left-3 top-9 bottom-0 w-px bg-border/50" />
                )}
                {/* Activity type icon */}
                <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-neon-400/10 text-[15px] font-bold uppercase text-neon-400 ring-1 ring-neon-400/20">
                  {activity.type[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate">
                    <span className="font-medium text-foreground">
                      {dealTitle}
                    </span>{" "}
                    <span className="text-muted-foreground/60 text-xs">
                      {companyName}
                    </span>{" "}
                    <span className="text-muted-foreground">&mdash;</span>{" "}
                    <span className="text-muted-foreground">
                      {activity.description}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground/70">
                    {formatDateTime(activity.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <Pagination total={activityTotal} pageSize={PAGE_SIZE_ACTIVITY} />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage(props: { searchParams: SearchParams }) {
  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-neon-500/50">
            Intelligence Overview
          </p>
          <h1 className="font-heading text-3xl font-bold tracking-tight">
            Dashboard
          </h1>
        </div>
        <span className="text-[0.6rem] tabular-nums uppercase tracking-wider text-muted-foreground/70">
          {new Date().toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </span>
      </div>
      <div className="accent-line" />
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-lg" />
            ))}
          </div>
        }
      >
        <DashboardContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
