"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { activityFormSchema, type ActivityFormValues } from "@/lib/validations";
import { addActivity } from "@/lib/actions/leads";
import { toast } from "sonner";

export function ActivityForm({ leadId }: { leadId: string }) {
  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: { type: "note", description: "" },
  });

  async function onSubmit(data: ActivityFormValues) {
    try {
      await addActivity(leadId, data.type, data.description);
      toast.success("Activity added");
      reset();
    } catch {
      toast.error("Failed to add activity");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
      <Select
        defaultValue="note"
        onValueChange={(v) => v && setValue("type", v as ActivityFormValues["type"])}
      >
        <SelectTrigger className="w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex-1 space-y-1">
        <Textarea
          placeholder="Add a note, log a call, etc."
          className="min-h-[60px]"
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">{errors.description.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSubmitting}>
        Add
      </Button>
    </form>
  );
}
