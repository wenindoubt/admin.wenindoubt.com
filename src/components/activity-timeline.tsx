"use client";

import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { LeadActivity } from "@/db/schema";

const VISIBLE_COUNT = 10;
const MODAL_PAGE_SIZE = 15;

function ActivityItem({
  activity,
  showConnector,
}: {
  activity: LeadActivity;
  showConnector: boolean;
}) {
  return (
    <div className="relative flex gap-3 py-3 text-sm">
      {showConnector && (
        <div className="absolute left-3 top-9 bottom-0 w-px bg-border/40" />
      )}
      <div className="relative z-10 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-400/10 text-[10px] font-bold uppercase text-gold-400 ring-1 ring-gold-400/20">
        {activity.type[0]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-foreground/90">{activity.description}</p>
        <p className="mt-0.5 text-xs text-muted-foreground/60">
          {new Date(activity.createdAt).toLocaleString()} &middot;{" "}
          <span className="capitalize">
            {activity.type.replaceAll("_", " ")}
          </span>
        </p>
      </div>
    </div>
  );
}

function AllActivitiesModal({ activities }: { activities: LeadActivity[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(activities.length / MODAL_PAGE_SIZE);
  const paged = activities.slice(
    page * MODAL_PAGE_SIZE,
    (page + 1) * MODAL_PAGE_SIZE,
  );

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="flex items-center justify-center gap-2 w-full mt-3 py-2.5 rounded-lg border border-border/30 text-xs font-medium text-muted-foreground/60 hover:text-foreground hover:border-gold-400/30 hover:bg-gold-400/[0.03] transition-all"
          />
        }
      >
        <Clock className="size-3.5" />
        View all {activities.length} activities
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        showCloseButton
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gold-400/10">
              <Clock className="size-3.5 text-gold-400" />
            </div>
            Activity History
          </DialogTitle>
          <DialogDescription>
            {activities.length} activities &middot; Showing{" "}
            {page * MODAL_PAGE_SIZE + 1}–
            {Math.min((page + 1) * MODAL_PAGE_SIZE, activities.length)} of{" "}
            {activities.length}
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto -mx-4 px-4 min-h-0">
          <div className="relative space-y-0">
            {paged.map((activity, i) => (
              <ActivityItem
                key={activity.id}
                activity={activity}
                showConnector={i < paged.length - 1}
              />
            ))}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-border/20 -mx-4 px-4">
            <p className="text-xs text-muted-foreground/50">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30"
              >
                <ChevronLeft className="size-4" />
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={`activity-page-${i}`}
                  type="button"
                  onClick={() => setPage(i)}
                  className={`flex size-8 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                    i === page
                      ? "bg-gold-400/15 text-gold-500"
                      : "text-muted-foreground/50 hover:text-foreground hover:bg-muted/60"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-30"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function ActivityTimeline({
  activities,
}: {
  activities: LeadActivity[];
}) {
  const visible = activities.slice(0, VISIBLE_COUNT);
  const hasMore = activities.length > VISIBLE_COUNT;

  return (
    <div className="relative space-y-0">
      {activities.length === 0 && (
        <p className="text-sm text-muted-foreground">No activity yet</p>
      )}
      {visible.map((activity, i) => (
        <ActivityItem
          key={activity.id}
          activity={activity}
          showConnector={i < visible.length - 1}
        />
      ))}
      {hasMore && <AllActivitiesModal activities={activities} />}
    </div>
  );
}
