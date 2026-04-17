"use client";
import { useState } from "react";
import { ThumbsUp, ThumbsDown, Send, MessageSquareHeart } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

export function DocsPageFeedback({ page }: { page: string }) {
  const [submitted, setSubmitted] = useState<boolean | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  const submitFeedback = trpc.pmFeedback.submit.useMutation();

  const handleVote = (helpful: boolean) => {
    setSubmitted(helpful);
    if (!helpful) setShowComment(true);
    trackEvent("docs.click", { page, helpful: String(helpful) } as any);
    if (helpful) {
      submitFeedback.mutate({
        type: "other",
        message: `Docs page "${page}" marked helpful`,
        page,
      });
    }
  };

  const handleSubmitComment = () => {
    if (!comment.trim()) return;
    submitFeedback.mutate({
      type: "other",
      message: comment || `Docs page "${page}" marked unhelpful`,
      page,
    });
    setShowComment(false);
  };

  if (submitted !== null && !showComment) {
    return (
      <div className="mt-16 pt-8 border-t border-border/50 text-center animate-in fade-in zoom-in-95 duration-500">
        <div className="inline-flex items-center justify-center p-4 rounded-full bg-primary/10 text-primary mb-4">
          <MessageSquareHeart size={24} />
        </div>
        <h4 className="text-foreground font-semibold">Thank you for your feedback!</h4>
        <p className="text-sm text-muted-foreground mt-1">Your input helps us improve FRIDAY's documentation.</p>
      </div>
    );
  }

  return (
    <div className="mt-16 pt-8 border-t border-border/50">
      <div className="flex flex-col items-center gap-5 bg-card/30 backdrop-blur-sm border border-border/50 rounded-3xl p-8 max-w-lg mx-auto shadow-sm">
        <p className="text-sm font-medium text-foreground">Was this page helpful?</p>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleVote(true)}
            className="rounded-xl hover:bg-green-500/10 hover:text-green-500 hover:border-green-500/30 transition-all px-6 border-border/60"
          >
            <ThumbsUp size={16} className="mr-2" /> Yes
          </Button>
          <Button
            variant="outline"
            onClick={() => handleVote(false)}
            className="rounded-xl hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/30 transition-all px-6 border-border/60"
          >
            <ThumbsDown size={16} className="mr-2" /> No
          </Button>
        </div>

        {showComment && (
          <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-top-4 duration-300 mt-2">
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="What could be improved? How can we make this better for you?"
              className="w-full px-4 py-3 text-sm bg-background/50 border border-border/60 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none h-24 placeholder:text-muted-foreground"
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!comment.trim() || submitFeedback.isPending}
              className="rounded-xl self-end"
            >
              <Send size={14} className="mr-2" /> Send Feedback
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
