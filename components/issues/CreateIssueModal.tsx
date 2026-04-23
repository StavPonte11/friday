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
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
// import { PmIssuePriority } from "@prisma/client";
const PmIssuePriority = {
    NONE: "NONE",
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    URGENT: "URGENT"
} as any;

import { trpc } from "@/lib/trpc/client";
import { useSession } from "next-auth/react";
import { Plus, Sparkles, Loader2, User, Hash, Bot } from "lucide-react";

export const DEFAULT_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE", "CANCELED"] as const;

const formSchema = z.object({
    title: z.string().min(1, { message: "Title is required" }),
    description: z.string().optional(),
    status: z.enum(DEFAULT_STATUSES),
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
    const { data: session } = useSession();
    const [open, setOpen] = useState(false);
    const utils = trpc.useUtils();

    // Listen for global command to open modal
    React.useEffect(() => {
        const handleOpen = () => setOpen(true);
        window.addEventListener("pm:create-issue", handleOpen);
        return () => window.removeEventListener("pm:create-issue", handleOpen);
    }, []);

    // Fetch members for assignee dropdown
    const { data: members, isLoading: isMembersLoading } = trpc.workspaces.members.useQuery(
        { workspaceId },
        { enabled: !!workspaceId && open }
    );

    const [checklistItems, setChecklistItems] = useState<string[]>([]);

    const TEMPLATES = [
        {
            id: "bug",
            name: "Bug Template",
            title: "[BUG] ",
            priority: "HIGH",
            description: "### Steps to Reproduce\n1. \n2. \n3. \n\n### Expected Behavior\n\n\n### Actual Behavior\n\n\n",
            checklists: ["Verify locally", "Add regression test", "Deploy fix"]
        },
        {
            id: "feature",
            name: "Feature Template",
            title: "[FEATURE] ",
            priority: "MEDIUM",
            description: "### User Story\nAs a [role], I want to [action] so that [benefit].\n\n### Acceptance Criteria\n- \n- \n",
            checklists: ["Write unit tests", "Update documentation", "Review with PM"]
        },
        {
            id: "infra",
            name: "Infra Template",
            title: "[INFRA] ",
            priority: "HIGH",
            description: "### Objective\n\n\n### Rollout Plan\n\n\n### Rollback Plan\n\n\n",
            checklists: ["Check staging environments", "Monitor APM after deploy", "Alert on-call"]
        }
    ];

    const applyTemplate = (templateId: string) => {
        const t = TEMPLATES.find(x => x.id === templateId);
        if (!t) return;
        (form.setValue as any)("title", t.title);
        (form.setValue as any)("description", t.description);
        (form.setValue as any)("priority", t.priority);
        setChecklistItems(t.checklists);
    };

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: "",
            description: "",
            status: "TODO",
            priority: PmIssuePriority.NONE,
            assigneeId: undefined,
            storyPoints: undefined,
            complexityScore: undefined,
        },
    });

    const [aiPrompt, setAiPrompt] = useState("");

    const generateMutation = trpc.pmIssues.generate.useMutation();

    const createMutation = trpc.pmIssues.create.useMutation();

    function onSubmit(values: z.infer<typeof formSchema>) {
        const userId = (session?.user as any)?.id || "admin@friday.local";
        
        createMutation.mutate({
            ...values,
            projectId,
            creatorId: userId,
            assigneeId: values.assigneeId === "unassigned" ? null : (values.assigneeId || null),
            checklistItems: checklistItems.length > 0 ? checklistItems : undefined,
        }, {
            onSuccess: () => {
                setOpen(false);
                form.reset();
                utils.pmIssues.listByProject.invalidate({ projectId });
                utils.pmIssues.listInfiniteByProject.invalidate({ projectId });
                onSuccess?.();
            },
            onError: () => {
                utils.pmIssues.listByProject.invalidate({ projectId });
                utils.pmIssues.listInfiniteByProject.invalidate({ projectId });
            }
        });
    }

    const handleGenerate = () => {
        if (!aiPrompt) return;
        generateMutation.mutate({ prompt: aiPrompt }, {
            onSuccess: (data: any) => {
                (form.setValue as any)("title", data.title);

                // Format description with subtasks and criteria
                let fullDesc = data.description + "\n\n";
                if (data.subtasks?.length) {
                    fullDesc += "### Subtasks\n" + data.subtasks.map((s: any) => `- [ ] ${s}`).join("\n") + "\n\n";
                }
                if (data.criteria?.length) {
                    fullDesc += "### Acceptance Criteria\n" + data.criteria.map((c: any) => `- ${c}`).join("\n");
                }

                (form.setValue as any)("description", fullDesc.trim());
                setAiPrompt("");
            }
        });
    };

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
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border rounded-md bg-muted/50 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                                    <Sparkles size={16} /> Auto-Generate with AI
                                </div>
                                <div className="flex gap-2">
                                    <Textarea
                                        placeholder="Briefly describe the issue... (e.g. 'Add a login page')"
                                        value={aiPrompt}
                                        onChange={(e) => setAiPrompt(e.target.value)}
                                        className="h-10 resize-none text-xs"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleGenerate}
                                        disabled={!aiPrompt || generateMutation.isPending}
                                        className="px-3 bg-secondary text-secondary-foreground rounded-md text-xs font-semibold hover:bg-secondary/80 disabled:opacity-50 min-w-[80px]"
                                    >
                                        {generateMutation.isPending ? <Loader2 className="animate-spin" size={14} /> : "Generate"}
                                    </button>
                                </div>
                            </div>

                            {/* Templates Widget */}
                            <div className="p-3 border rounded-md bg-muted/20 space-y-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    Template Setup
                                </div>
                                <div>
                                    <Select onValueChange={applyTemplate}>
                                        <SelectTrigger className="w-full text-xs h-10">
                                            <SelectValue placeholder="Choose a structured template" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {TEMPLATES.map(t => (
                                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
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
                                        <RichTextEditor
                                            value={field.value || ""}
                                            onChange={field.onChange}
                                            placeholder="Provide acceptance criteria and context..."
                                            minHeight="min-h-[100px]"
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
                                                {DEFAULT_STATUSES.map((status) => (
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
                                                {Object.values(PmIssuePriority).map((priority: any) => (
                                                    <SelectItem key={priority as string} value={priority as string}>
                                                        {priority as string}
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
