"use client";

import {
  AlertTriangle,
  Loader2,
  Mail,
  RefreshCw,
  Send,
  Wand2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  confirmStageTransitionWithDraft,
  getGmailStatus,
} from "@/lib/actions/gmail";

type Props = {
  dealId: string;
  dealTitle: string;
  toStage: string;
  contactEmail: string;
  contactName: string;
  onConfirmAction: () => void;
  onCancelAction: () => void;
};

// -- Streaming helper --

async function streamOutreach(
  dealId: string,
  mode: string,
  options?: {
    currentBody?: string;
    selectedText?: string;
    instructions?: string;
  },
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const res = await fetch("/api/ai/outreach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dealId, mode, ...options }),
  });

  if (!res.ok) throw new Error("Draft generation failed");
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let accumulated = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value);
    accumulated += chunk;
    onChunk?.(chunk);
  }

  return accumulated;
}

// -- Floating Toolbar --

function SelectionToolbar({
  onRegenerate,
  isGenerating,
}: {
  onRegenerate: (instructions: string) => void;
  isGenerating: boolean;
}) {
  const [prompt, setPrompt] = useState("");

  return (
    <div
      role="toolbar"
      onMouseDown={(e) => e.preventDefault()}
      className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-background p-1.5 shadow-lg ring-1 ring-black/5"
    >
      <Input
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isGenerating) {
            onRegenerate(prompt);
            setPrompt("");
          }
        }}
        placeholder="Instructions (optional)..."
        className="h-7 min-w-[200px] border-0 bg-muted/40 text-xs focus-visible:ring-0 focus-visible:border-0"
      />
      <Button
        size="xs"
        onClick={() => {
          onRegenerate(prompt);
          setPrompt("");
        }}
        disabled={isGenerating}
        className="shrink-0"
      >
        {isGenerating ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Wand2 className="size-3" />
        )}
        Rewrite
      </Button>
    </div>
  );
}

// -- Main Component --

export function EmailDraftModal({
  dealId,
  dealTitle,
  toStage,
  contactEmail,
  contactName,
  onConfirmAction,
  onCancelAction,
}: Props) {
  // Form state
  const [to, setTo] = useState(contactEmail);
  const [subject, setSubject] = useState("Introduction from WenInDoubt");
  const [body, setBody] = useState("");

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [gmailEmail, setGmailEmail] = useState<string>();

  // Selection state for partial regeneration
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [showToolbar, setShowToolbar] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const didInitialGenerate = useRef(false);

  // Check Gmail status on mount
  useEffect(() => {
    getGmailStatus().then((status) => {
      setGmailConnected(status.connected);
      setGmailEmail(status.email);
    });
  }, []);

  // Generate initial draft on mount
  useEffect(() => {
    if (didInitialGenerate.current) return;
    didInitialGenerate.current = true;

    setIsGenerating(true);
    streamOutreach(dealId, "initial", undefined, (chunk) => {
      setBody((prev) => prev + chunk);
    })
      .catch(() => toast.error("Failed to generate draft"))
      .finally(() => setIsGenerating(false));
  }, [dealId]);

  // Full regeneration
  const handleRegenerateFull = useCallback(async () => {
    setIsGenerating(true);
    setBody("");
    setShowToolbar(false);

    try {
      await streamOutreach(
        dealId,
        "regenerate_full",
        { currentBody: body },
        (chunk) => setBody((prev) => prev + chunk),
      );
    } catch {
      toast.error("Failed to regenerate draft");
    } finally {
      setIsGenerating(false);
    }
  }, [dealId, body]);

  // Partial regeneration (selected text)
  const handleRegeneratePartial = useCallback(
    async (instructions: string) => {
      if (!selectionRange || !bodyRef.current) return;

      const selectedText = body.slice(selectionRange.start, selectionRange.end);
      setIsGenerating(true);

      try {
        const replacement = await streamOutreach(dealId, "regenerate_partial", {
          currentBody: body,
          selectedText,
          instructions,
        });

        setBody(
          (prev) =>
            prev.slice(0, selectionRange.start) +
            replacement +
            prev.slice(selectionRange.end),
        );
      } catch {
        toast.error("Failed to rewrite selection");
      } finally {
        setIsGenerating(false);
        setShowToolbar(false);
        setSelectionRange(null);
      }
    },
    [dealId, body, selectionRange],
  );

  // Detect text selection in textarea
  const handleSelectionChange = useCallback(() => {
    const textarea = bodyRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    if (start !== end) {
      setSelectionRange({ start, end });
      setShowToolbar(true);
    } else {
      setShowToolbar(false);
      setSelectionRange(null);
    }
  }, []);

  // Confirm: create Gmail draft + move deal
  const handleConfirm = useCallback(async () => {
    setIsSubmitting(true);
    try {
      const result = await confirmStageTransitionWithDraft(
        dealId,
        toStage,
        to,
        subject,
        body,
      );

      if (result.success) {
        toast.success("Gmail draft created — deal moved to Contacted");
        onConfirmAction();
      } else {
        toast.error(result.error ?? "Failed to create Gmail draft");
      }
    } catch {
      toast.error("Failed to create Gmail draft. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [dealId, toStage, to, subject, body, onConfirmAction]);

  return (
    <Dialog open onOpenChange={(open) => !open && onCancelAction()}>
      <DialogContent className="sm:max-w-4xl w-[calc(100%-2rem)] h-[calc(100vh-4rem)] max-h-none overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-gold-400/10">
              <Mail className="size-3.5 text-gold-400" />
            </div>
            Draft Outreach Email
          </DialogTitle>
          <DialogDescription>
            AI-drafted email for {contactName} &middot; {dealTitle}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-4 px-4 space-y-4 min-h-0">
          {/* Gmail connection warning */}
          {gmailConnected === false && (
            <div className="rounded-lg border border-amber-400/30 bg-amber-400/[0.06] px-3.5 py-2.5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-sm">
                <AlertTriangle className="size-4 text-amber-500 shrink-0" />
                <span>Gmail not connected. Connect to create drafts.</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open("/api/gmail/authorize", "_blank")}
                className="shrink-0 border-amber-400/30 text-amber-600"
              >
                Connect Gmail
              </Button>
            </div>
          )}

          {/* Gmail connected indicator */}
          {gmailConnected && gmailEmail && (
            <div className="text-xs text-muted-foreground/60">
              Draft will be created in{" "}
              <span className="font-medium text-foreground/80">
                {gmailEmail}
              </span>
            </div>
          )}

          {/* To field */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">
              To
            </Label>
            <Input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              type="email"
            />
          </div>

          {/* Subject field */}
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">
              Subject
            </Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body field with AI controls */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground/80">
                Body
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerateFull}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <RefreshCw className="size-3" />
                )}
                Regenerate
              </Button>
            </div>

            <div className="relative">
              <Textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                onMouseUp={handleSelectionChange}
                onKeyUp={handleSelectionChange}
                placeholder={
                  isGenerating ? "Generating draft..." : "Email body..."
                }
                className="min-h-[300px] h-full resize-none !field-sizing-normal"
                disabled={isGenerating && !body}
              />

              {/* Floating toolbar for partial regeneration */}
              {showToolbar && !isGenerating && (
                <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 z-10">
                  <SelectionToolbar
                    onRegenerate={handleRegeneratePartial}
                    isGenerating={isGenerating}
                  />
                </div>
              )}
            </div>

            {/* Generating indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <Loader2 className="size-3 animate-spin" />
                Generating...
              </div>
            )}
          </div>
        </div>

        <DialogFooter className={showToolbar ? "mt-10" : ""}>
          <Button
            variant="outline"
            onClick={onCancelAction}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={
              isGenerating || isSubmitting || !body.trim() || !gmailConnected
            }
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                Creating Draft...
              </>
            ) : (
              <>
                <Send className="size-3.5" />
                Create Gmail Draft
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
