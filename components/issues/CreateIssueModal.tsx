"use client";

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { PmIssueStatus, PmIssuePriority } from "@prisma/client";
import { trpc } from "@/lib/trpc/client";
import { Plus, Sparkles, Loader2, User, Hash } from "lucide-react";

const formSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    status: z.nativeEnum(PmIssueStatus),
    priority: z.nativeEnum(PmIssuePriority),
    assigneeId: z.string().optional(),
    storyPoints: z.number().min(0).optional(),
    complexityScore: z.number().min(1).max(10).optional(),
});

interface CreateIssueModalProps {
    projectId: string;
    workspaceId: string;
    onSuccess?: () => void;
}

export function CreateIssueModal({ projectId, workspaceId, onSuccess }: CreateIssueModalProps) {
    const [open, setOpen] = useState(false);
    const utils = trpc.useUtils();

    // Fetch members for assignee dropdown
    const { data: members, isLoading: isMembersLoading } = trpc.workspaces.members.useQuery(
        { workspaceId },
        { enabled: !!workspaceId && open }
    );

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            status: PmIssueStatus.TODO,
            priority: PmIssuePriority.NONE,
            assigneeId: undefined,
            storyPoints: undefined,
            complexityScore: undefined,
        },
    });

    const [aiPrompt, setAiPrompt] = useState("");

    const generateMutation = trpc.pmIssues.generate.useMutation({
        onSuccess: (data) => {
            form.setValue("title", data.title);

            // Format description with subtasks and criteria
            let fullDesc = data.description + "\n\n";
            if (data.subtasks?.length) {
                fullDesc += "### Subtasks\n" + data.subtasks.map(s => `- [ ] ${s}`).join("\n") + "\n\n";
            }
            if (data.criteria?.length) {
                fullDesc += "### Acceptance Criteria\n" + data.criteria.map(c => `- ${c}`).join("\n");
            }

            form.setValue("description", fullDesc.trim());
            setAiPrompt("");
        }
    });

    const createMutation = trpc.pmIssues.create.useMutation({
        onMutate: async (newIssue) => {
            // Cancel outgoing fetches so they don't overwrite optimistic update
            await utils.pmIssues.listByProject.cancel({ projectId });

            // Snapshot previous value
            const previousIssues = utils.pmIssues.listByProject.getData({ projectId });

            // Optimistically update
            if (previousIssues) {
                utils.pmIssues.listByProject.setData({ projectId }, [
                    {
                        ...newIssue,
                        id: `temp-${Date.now()}`,
                        key: "FPM-??",
                        assigneeId: newIssue.assigneeId || null,
                        creatorId: newIssue.creatorId,
                        storyPoints: newIssue.storyPoints || null,
                        complexityScore: newIssue.complexityScore || null,
                        predictedTime: null,
                        sprintId: null,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        assignee: null,
                        labels: [],
                        sprint: null,
                        priority: newIssue.priority || PmIssuePriority.NONE,
                        status: newIssue.status || PmIssueStatus.TODO,
                        description: newIssue.description || null,
                    },
                    ...previousIssues,
                ]);
            }

            return { previousIssues };
        },
        onError: (err, newIssue, context) => {
            // Rollback on error
            if (context?.previousIssues) {
                utils.pmIssues.listByProject.setData({ projectId }, context.previousIssues);
            }
        },
        onSettled: () => {
            // Sync with server once mutation settles
            utils.pmIssues.listByProject.invalidate({ projectId });
        },
        onSuccess: () => {
            setOpen(false);
            form.reset();
            onSuccess?.();
        },
    });

    function onSubmit(values: z.infer<typeof formSchema>) {
        if (!projectId) return;
        
        createMutation.mutate({
            ...values,
            projectId,
            creatorId: "mock-creator-id", // Hardcoded for foundational mock, usually from session
            assigneeId: values.assigneeId || undefined,
            // Only pass numbers if they exist
            // (trpc router currently doesn't accept storyPoints/complexity, but we pass them for when it does. We will update the router next)
        });
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors">
                    <Plus size={16} /> New Issue
                </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Create New Issue</DialogTitle>
                    <DialogDescription>
                        Define a new unit of work for this project.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* AI Auto-Generate Widget */}
                        <div className="p-3 border rounded-md bg-muted/50 space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                <Sparkles size={16} /> Auto-Generate with AI
                            </div>
                            <div className="flex gap-2">
                                <Textarea
                                    placeholder="Briefly describe the issue... (e.g. 'Add a login page via OAuth')"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    className="min-h-[60px] resize-none"
                                />
                                <button
                                    type="button"
                                    onClick={() => generateMutation.mutate({ prompt: aiPrompt })}
                                    disabled={!aiPrompt || generateMutation.isPending}
                                    className="px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                >
                                    {generateMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Generate"}
                                </button>
                            </div>
                        </div>

                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Implement OAuth login..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Provide acceptance criteria and context..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a status" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(PmIssueStatus).map((status) => (
                                                    <SelectItem key={status} value={status}>
                                                        {status.replace('_', ' ')}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="priority"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Priority</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a priority" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(PmIssuePriority).map((priority) => (
                                                    <SelectItem key={priority} value={priority}>
                                                        {priority}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border mt-4">
                            <FormField
                                control={form.control}
                                name="assigneeId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="flex items-center gap-1"><User size={14} /> Assignee</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value || ""}>
                                            <FormControl>
                                                <SelectTrigger disabled={isMembersLoading}>
                                                    <SelectValue placeholder={isMembersLoading ? "Loading..." : "Unassigned"} />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value={"unassigned"}>Unassigned</SelectItem>
                                                {members?.map((member: any) => (
                                                    <SelectItem key={member.user.id} value={member.user.id}>
                                                        {member.user.name || member.user.email}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-2">
                                <FormField
                                    control={form.control}
                                    name="storyPoints"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1"><Hash size={14} /> Est. Points</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    placeholder="e.g. 5" 
                                                    {...field} 
                                                    value={field.value ?? ""} 
                                                    onChange={(e) => field.onChange(e.target.value === "" ? undefined : Number(e.target.value))}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="complexityScore"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="flex items-center gap-1"><Hash size={14} /> Complexity</FormLabel>
                                            <FormControl>
                                                <Input 
                                                    type="number" 
                                                    min="1"
                                                    max="10"
                                                    placeholder="1-10" 
                                                    {...field} 
                                                    value={field.value || ""} 
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-4">
                            <button
                                type="button"
                                onClick={() => setOpen(false)}
                                className="px-4 py-2 text-sm border rounded-md hover:bg-muted"
                                disabled={createMutation.isPending}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 flex items-center gap-2 disabled:opacity-50"
                                disabled={createMutation.isPending || !projectId}
                            >
                                {createMutation.isPending && <Loader2 className="animate-spin" size={16} />}
                                Create Issue
                            </button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
