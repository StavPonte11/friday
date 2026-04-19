"use client";

import { useState } from "react";
import { MessageCircle, X, Bug, Lightbulb, Loader2 } from "lucide-react";

export function GlobalFeedbackButton() {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<"BUG" | "FEATURE">("BUG");
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async () => {
        if (!text.trim()) return;
        setSubmitting(true);
        try {
            await fetch("/api/feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type, text, url: window.location.href }),
            });
            setSuccess(true);
            setTimeout(() => {
                setOpen(false);
                setSuccess(false);
                setText("");
            }, 2000);
        } catch (e) {
            alert("Failed to submit feedback");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50">
            {open ? (
                <div className="bg-card w-80 rounded-2xl shadow-2xl border border-border overflow-hidden animate-in fade-in slide-in-from-bottom-5">
                    <div className="bg-primary p-4 flex justify-between items-center">
                        <h3 className="text-primary-foreground font-semibold flex items-center gap-2">
                            <MessageCircle size={18} /> Send Feedback
                        </h3>
                        <button onClick={() => setOpen(false)} className="text-primary-foreground/70 hover:text-primary-foreground">
                            <X size={18} />
                        </button>
                    </div>
                    {success ? (
                        <div className="p-8 text-center text-green-500 font-medium">
                            <p>Thank you! Your feedback has been received.</p>
                        </div>
                    ) : (
                        <div className="p-4 space-y-4">
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setType("BUG")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md border ${type === "BUG" ? "bg-red-500/10 border-red-500 text-red-500" : "bg-muted border-transparent"}`}
                                >
                                    <Bug size={14} /> Report Bug
                                </button>
                                <button 
                                    onClick={() => setType("FEATURE")}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-md border ${type === "FEATURE" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-muted border-transparent"}`}
                                >
                                    <Lightbulb size={14} /> Feature Request
                                </button>
                            </div>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder={type === "BUG" ? "What went wrong?" : "What should we add?"}
                                className="w-full h-28 p-3 text-sm bg-background border border-border rounded-lg resize-none outline-none focus:ring-1 focus:ring-primary"
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={!text.trim() || submitting}
                                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {submitting ? <Loader2 size={16} className="animate-spin" /> : "Submit"}
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
                >
                    <MessageCircle size={24} />
                </button>
            )}
        </div>
    );
}
