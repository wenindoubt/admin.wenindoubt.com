"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addActivity } from "@/lib/actions/leads";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { type ActivityFormValues, activityFormSchema } from "@/lib/validations";

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

  const inputClasses =
    "bg-card/50 border-border/50 focus:border-gold-400/50 focus:ring-gold-400/20";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
      <Select
        defaultValue="note"
        onValueChange={(v) =>
          v && setValue("type", v as ActivityFormValues["type"])
        }
      >
        <SelectTrigger className={`w-32 ${inputClasses}`}>
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
          className={`min-h-[60px] ${inputClasses}`}
          {...register("description")}
        />
        {errors.description && (
          <p className="text-sm text-destructive">
            {errors.description.message}
          </p>
        )}
      </div>
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-gold-400 text-primary-foreground hover:bg-gold-500 border-0 self-start"
      >
        Add
      </Button>
    </form>
  );
}
