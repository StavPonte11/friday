import { z } from "zod";

export const GanttItemSchema = z.object({
    id: z.string(),
    title: z.string(),
    startDate: z.date().nullable(),
    dueDate: z.date().nullable(),
    status: z.string(), // "TODO" | "IN_PROGRESS" | "DONE" | "BACKLOG" | "BLOCKED"
    assigneeId: z.string().nullable(),
    assigneeName: z.string().nullable(),
    projectId: z.string(),
    projectName: z.string(),
    dependencies: z.array(z.string()), // IDs of issues this issue depends on
});

export type GanttItem = z.infer<typeof GanttItemSchema>;

export const ViewFilterSchema = z.object({
    projectIds: z.array(z.string()).optional(),
    assigneeIds: z.array(z.string()).optional(),
    statuses: z.array(z.string()).optional(),
    dateRange: z.object({
        from: z.date(),
        to: z.date(),
    }).optional(),
});

export type ViewFilter = z.infer<typeof ViewFilterSchema>;
