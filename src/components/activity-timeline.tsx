"use client";

import { useState } from "react";
import { PaginationBar } from "@/components/pagination";
import type { DealActivity } from "@/db/schema";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { PAGE_SIZE_ACTIVITY } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function ActivityItem({
  activity,
  showConnector,
}: {
  activity: DealActivity;
  showConnector: boolean;
}) {
  return (
    <div className="relative flex gap-3 py-3 text-sm">
      {showConnector && (
        <div className="absolute left-3 top-9 bottom-0 w-px bg-border/40" />
      )}
      <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-neon-400/10 text-[15px] font-bold uppercase text-neon-400 ring-1 ring-neon-400/20">
        {activity.type[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground/90">{activity.description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          {formatDateTime(activity.createdAt)} &middot;{" "}
          <span>
            {ACTIVITY_TYPES.find((t) => t.value === activity.type)?.label ??
              activity.type}
          </span>
        </p>
      </div>
    </div>
  );
}

export function ActivityTimeline({
  activities,
}: {
  activities: DealActivity[];
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const total = activities.length;
  const totalPages = Math.ceil(total / PAGE_SIZE_ACTIVITY);
  const start = (currentPage - 1) * PAGE_SIZE_ACTIVITY;
  const visible = activities.slice(start, start + PAGE_SIZE_ACTIVITY);

  return (
    <div className="relative space-y-0">
      {total === 0 && (
        <p className="text-sm text-muted-foreground">No activity yet</p>
      )}
      {visible.map((activity, i) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          showConnector={i < visible.length - 1}
        />
      ))}
      <PaginationBar
        currentPage={currentPage}
        totalPages={totalPages}
        total={total}
        pageSize={PAGE_SIZE_ACTIVITY}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
