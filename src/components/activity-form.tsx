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
import { addDealActivity } from "@/lib/actions/deals";
import { ACTIVITY_TYPES } from "@/lib/constants";
import { FORM_INPUT_CLASSES } from "@/lib/utils";
import { type ActivityFormValues, activityFormSchema } from "@/lib/validations";

export function ActivityForm({ dealId }: { dealId: string }) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    mode: "onTouched",
    defaultValues: { type: "call", description: "" },
  });

  const currentType = watch("type");

  async function onSubmit(data: ActivityFormValues) {
    try {
      await addDealActivity(dealId, data.type, data.description);
      toast.success("Activity added");
      reset();
    } catch {
      toast.error("Failed to add activity");
    }
  }

  const inputClasses = FORM_INPUT_CLASSES;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex gap-3">
      <Select
        defaultValue="call"
        onValueChange={(v) =>
          v && setValue("type", v as ActivityFormValues["type"])
        }
      >
        <SelectTrigger className={`w-32 ${inputClasses}`}>
          <SelectValue>
            {ACTIVITY_TYPES.find((t) => t.value === currentType)?.label}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ACTIVITY_TYPES.map((t) => (
            <SelectItem key={t.value} value={t.value}>
              {t.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {errors.type && (
        <p className="text-sm text-destructive">{errors.type.message}</p>
      )}
      <div className="flex-1 space-y-1">
        <Textarea
          placeholder="Log a call, email, or meeting..."
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
        className="bg-neon-400 text-primary-foreground hover:bg-neon-500 border-0 self-start"
      >
        Add
      </Button>
    </form>
  );
}
