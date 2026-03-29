"use client";

import {
  AlertTriangle,
  Loader2,
  Mail,
  Pencil,
  RefreshCw,
  Send,
  Wand2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
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
import { cn } from "@/lib/utils";

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

// -- Compute text offset from DOM selection to body string offset --

function getTextOffset(
  container: Node,
  targetNode: Node,
  nodeOffset: number,
): number {
  let offset = 0;
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

  while (walker.nextNode()) {
    if (walker.currentNode === targetNode) {
      return offset + nodeOffset;
    }
    offset += walker.currentNode.textContent?.length ?? 0;
  }

  return -1;
}

// -- Floating Toolbar --

function SelectionToolbar({
  style,
  onRegenerate,
  onDismiss,
  isRegenerating,
}: {
  style: React.CSSProperties;
  onRegenerate: (instructions: string) => void;
  onDismiss: () => void;
  isRegenerating: boolean;
}) {
  const [prompt, setPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRegenerating) {
        e.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onDismiss, isRegenerating]);

  return (
    <div
      role="toolbar"
      style={style}
      className="absolute z-20 flex items-center gap-1.5 rounded-lg border border-border/60 bg-background p-1.5 shadow-lg ring-1 ring-black/5"
    >
      <Input
        ref={inputRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isRegenerating) {
            onRegenerate(prompt);
          }
        }}
        placeholder="Instructions (optional)"
        disabled={isRegenerating}
        className="h-7 w-44 border-0 bg-muted/40 text-xs focus-visible:ring-0 focus-visible:border-0"
      />
      <Button
        size="xs"
        onClick={() => onRegenerate(prompt)}
        disabled={isRegenerating}
        className="shrink-0"
      >
        {isRegenerating ? (
          <Loader2 className="size-3 animate-spin" />
        ) : (
          <Wand2 className="size-3" />
        )}
        Rewrite
      </Button>
      {!isRegenerating && (
        <Button
          size="icon-xs"
          variant="ghost"
          onClick={onDismiss}
          className="shrink-0"
        >
          <X className="size-3" />
        </Button>
      )}
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
  const [isEditing, setIsEditing] = useState(false);

  // Selection state for partial regeneration
  const [selectionRange, setSelectionRange] = useState<{
    start: number;
    end: number;
  } | null>(null);
  const [isPartialGenerating, setIsPartialGenerating] = useState(false);
  const [replacementText, setReplacementText] = useState<string | null>(null);

  // Refs & positioning
  const bodyContainerRef = useRef<HTMLDivElement>(null);
  const markRef = useRef<HTMLElement>(null);
  const justSelectedRef = useRef(false);
  const [toolbarPos, setToolbarPos] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const didInitialGenerate = useRef(false);

  // Check Gmail status on mount
  useEffect(() => {
    getGmailStatus()
      .then((status) => {
        setGmailConnected(status.connected);
        setGmailEmail(status.email);
      })
      .catch(() => setGmailConnected(false));
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

  // Position toolbar near the mark element — only recompute when selection changes, not on every stream chunk
  // biome-ignore lint/correctness/useExhaustiveDependencies: selectionRange triggers mark DOM mount that we need to measure
  useLayoutEffect(() => {
    if (!markRef.current || !bodyContainerRef.current) {
      setToolbarPos(null);
      return;
    }
    const markRect = markRef.current.getBoundingClientRect();
    const containerRect = bodyContainerRef.current.getBoundingClientRect();
    setToolbarPos({
      top: markRect.bottom - containerRect.top + 6,
      left: Math.max(
        0,
        Math.min(
          markRect.left - containerRect.left + markRect.width / 2 - 140,
          containerRect.width - 300,
        ),
      ),
    });
  }, [selectionRange]);

  // Dismiss selection
  const dismissSelection = useCallback(() => {
    if (!isPartialGenerating) {
      setSelectionRange(null);
      setReplacementText(null);
    }
  }, [isPartialGenerating]);

  // Full regeneration
  const handleRegenerateFull = useCallback(async () => {
    setIsGenerating(true);
    const currentBody = body;
    setBody("");
    dismissSelection();

    try {
      await streamOutreach(
        dealId,
        "regenerate_full",
        { currentBody },
        (chunk) => setBody((prev) => prev + chunk),
      );
    } catch {
      toast.error("Failed to regenerate draft");
    } finally {
      setIsGenerating(false);
    }
  }, [dealId, body, dismissSelection]);

  // Partial regeneration (selected text)
  const handleRegeneratePartial = useCallback(
    async (instructions: string) => {
      if (!selectionRange) return;

      const selectedText = body.slice(selectionRange.start, selectionRange.end);
      setIsPartialGenerating(true);
      setReplacementText("");

      try {
        const replacement = await streamOutreach(
          dealId,
          "regenerate_partial",
          { currentBody: body, selectedText, instructions },
          (chunk) => setReplacementText((prev) => (prev ?? "") + chunk),
        );

        setBody(
          (prev) =>
            prev.slice(0, selectionRange.start) +
            replacement +
            prev.slice(selectionRange.end),
        );
      } catch {
        toast.error("Failed to rewrite selection");
      } finally {
        setIsPartialGenerating(false);
        setReplacementText(null);
        setSelectionRange(null);
      }
    },
    [dealId, body, selectionRange],
  );

  // Handle text selection in view mode
  const handleMouseUp = useCallback(() => {
    if (isGenerating || isPartialGenerating) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !bodyContainerRef.current)
      return;

    const range = selection.getRangeAt(0);
    if (!bodyContainerRef.current.contains(range.commonAncestorContainer))
      return;

    const start = getTextOffset(
      bodyContainerRef.current,
      range.startContainer,
      range.startOffset,
    );
    const end = getTextOffset(
      bodyContainerRef.current,
      range.endContainer,
      range.endOffset,
    );

    if (start >= 0 && end >= 0 && start !== end && end <= body.length) {
      setSelectionRange({ start, end });
      selection.removeAllRanges();
      justSelectedRef.current = true;
    }
  }, [body.length, isGenerating, isPartialGenerating]);

  // Click on body text to dismiss selection — skip if mouseup just created a selection
  const handleBodyClick = useCallback(
    (e: React.MouseEvent) => {
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }
      if ((e.target as HTMLElement).closest("[data-selection-mark]")) return;
      dismissSelection();
    },
    [dismissSelection],
  );

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

  // Render body content with optional highlight
  const renderBodyContent = () => {
    if (!body) {
      return (
        <span className="text-muted-foreground">
          {isGenerating ? "Generating draft..." : "Email body..."}
        </span>
      );
    }

    if (!selectionRange) return body;

    const before = body.slice(0, selectionRange.start);
    const selected = body.slice(selectionRange.start, selectionRange.end);
    const after = body.slice(selectionRange.end);

    return (
      <>
        {before}
        <mark
          ref={markRef}
          data-selection-mark
          className={cn(
            "rounded-sm px-px -mx-px",
            isPartialGenerating
              ? "bg-gold-400/20 animate-pulse"
              : "bg-gold-400/25 hover:bg-gold-400/30",
          )}
        >
          {isPartialGenerating && replacementText !== null
            ? replacementText || selected
            : selected}
        </mark>
        {after}
      </>
    );
  };

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
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    dismissSelection();
                    setIsEditing((prev) => !prev);
                  }}
                  disabled={isGenerating || isPartialGenerating}
                >
                  <Pencil className="size-3" />
                  {isEditing ? "Done" : "Edit"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerateFull}
                  disabled={isGenerating || isPartialGenerating}
                >
                  {isGenerating ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <RefreshCw className="size-3" />
                  )}
                  Regenerate
                </Button>
              </div>
            </div>

            {isEditing ? (
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Email body..."
                className="min-h-[300px] h-full resize-none !field-sizing-normal"
              />
            ) : (
              <div className={cn("relative", selectionRange && "pb-12")}>
                {/* biome-ignore lint/a11y/useKeyWithClickEvents: click-to-dismiss is supplementary mouse UX */}
                {/* biome-ignore lint/a11y/noStaticElementInteractions: interactive text selection area */}
                <div
                  ref={bodyContainerRef}
                  onMouseUp={handleMouseUp}
                  onClick={handleBodyClick}
                  className={cn(
                    "min-h-[300px] w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm whitespace-pre-wrap select-text leading-relaxed",
                    isGenerating && "select-none",
                  )}
                >
                  {renderBodyContent()}
                </div>

                {/* Floating toolbar for partial regeneration */}
                {selectionRange && toolbarPos && (
                  <SelectionToolbar
                    style={{ top: toolbarPos.top, left: toolbarPos.left }}
                    onRegenerate={handleRegeneratePartial}
                    onDismiss={dismissSelection}
                    isRegenerating={isPartialGenerating}
                  />
                )}
              </div>
            )}

            {/* Generating indicator */}
            {isGenerating && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground/60">
                <Loader2 className="size-3 animate-spin" />
                Generating...
              </div>
            )}

            {/* Selection hint */}
            {!isEditing &&
              !isGenerating &&
              !isPartialGenerating &&
              !selectionRange &&
              body && (
                <div className="flex items-center gap-1.5 text-sm text-gold-400">
                  <Wand2 className="size-3.5" />
                  Select text to rewrite with AI
                </div>
              )}
          </div>
        </div>

        <DialogFooter>
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
              isGenerating ||
              isPartialGenerating ||
              isSubmitting ||
              !body.trim() ||
              !gmailConnected
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
