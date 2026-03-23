import { Suspense } from "react";
import { getLeadStats } from "@/lib/actions/leads";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { LEAD_STATUSES } from "@/lib/constants";
import { Users, DollarSign, TrendingUp, Activity } from "lucide-react";

async function DashboardContent() {
  const stats = await getLeadStats();

  const totalPipelineValue = stats.pipelineValues.reduce(
    (sum, pv) => sum + Number(pv.total),
    0
  );

  const activeStatuses = ["new", "contacted", "qualifying", "proposal_sent", "negotiating"];
  const activePipelineValue = stats.pipelineValues
    .filter((pv) => activeStatuses.includes(pv.status))
    .reduce((sum, pv) => sum + Number(pv.total), 0);

  const wonCount = stats.statusCounts.find((s) => s.status === "won")?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.totalLeads}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Pipeline</CardTitle>
            <DollarSign className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${activePipelineValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
            <TrendingUp className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${totalPipelineValue.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Won Deals</CardTitle>
            <Activity className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{wonCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline by status */}
        <Card>
          <CardHeader>
            <CardTitle>Pipeline by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {LEAD_STATUSES.map((s) => {
                const count =
                  stats.statusCounts.find((sc) => sc.status === s.value)?.count ?? 0;
                const value =
                  stats.pipelineValues.find((pv) => pv.status === s.value)?.total ?? "0";
                return (
                  <div key={s.value} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={s.color}>
                        {s.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {count} lead{count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      ${Number(value).toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* By source */}
        <Card>
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.sourceCounts.map((sc) => (
                <div
                  key={sc.source}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm capitalize">
                    {sc.source.replace("_", " ")}
                  </span>
                  <span className="text-sm font-medium">{sc.count}</span>
                </div>
              ))}
              {stats.sourceCounts.length === 0 && (
                <p className="text-sm text-muted-foreground">No data yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.recentActivities.length === 0 && (
              <p className="text-sm text-muted-foreground">No activity yet</p>
            )}
            {stats.recentActivities.map(({ activity, leadFirstName, leadLastName }) => (
              <div key={activity.id} className="flex items-start gap-3 text-sm">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase">
                  {activity.type[0]}
                </div>
                <div>
                  <p>
                    <span className="font-medium">
                      {leadFirstName} {leadLastName}
                    </span>{" "}
                    &mdash; {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </div>
  );
}
