"use client";

import { CalendarClock, Loader2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface Props {
  issueId: string;
  /** Pre-fill start/end from existing dueDate if available */
  defaultDueDate?: Date;
}

export function ScheduleMeeting({ issueId, defaultDueDate }: Props) {
  const [open, setOpen] = useState(false);
  const [startDate, setStartDate] = useState(
    defaultDueDate
      ? new Date(defaultDueDate.getTime() - 60 * 60 * 1000).toISOString().slice(0, 16)
      : "",
  );
  const [endDate, setEndDate] = useState(
    defaultDueDate ? defaultDueDate.toISOString().slice(0, 16) : "",
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const { data: provider } = trpc.pmCalendar.getConnectedProvider.useQuery();

  const scheduleMutation = trpc.pmCalendar.scheduleMeeting.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setTimeout(() => { setOpen(false); setSuccess(false); }, 1500);
    },
    onError: (err) => setError(err.message),
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        title="Schedule meeting on calendar"
      >
        <CalendarClock className="w-3.5 h-3.5" />
        Schedule
      </button>
    );
  }

  return (
    <div className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-1.5">
          <CalendarClock className="w-4 h-4" />
          Schedule Meeting
        </h4>
        <button
          onClick={() => { setOpen(false); setError(""); }}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          ✕
        </button>
      </div>

      {!provider ? (
        <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded px-3 py-2">
          No calendar connected.{" "}
          <a href="/settings/integrations" className="underline hover:no-underline">
            Connect in Settings →
          </a>
        </div>
      ) : (
        <>
          <p className="text-xs text-zinc-400">
            Connected: <span className="capitalize text-zinc-300">{provider.provider}</span>
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Start</label>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">End / Due Date</label>
              <input
                type="datetime-local"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-xs bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-zinc-200 focus:outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">✓ Synced to calendar!</p>}

          <button
            onClick={() => {
              setError("");
              if (!startDate || !endDate) { setError("Both dates are required"); return; }
              if (new Date(endDate) <= new Date(startDate)) { setError("End must be after start"); return; }
              scheduleMutation.mutate({
                issueId,
                startDate: new Date(startDate).toISOString(),
                endDate: new Date(endDate).toISOString(),
              });
            }}
            disabled={scheduleMutation.isPending}
            className="w-full flex items-center justify-center gap-1.5 text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50 transition-colors"
          >
            {scheduleMutation.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
            {scheduleMutation.isPending ? "Scheduling…" : "Create Calendar Event"}
          </button>
        </>
      )}
    </div>
  );
}
