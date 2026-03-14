"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Plus, GripVertical, Trash2, Save, Loader2, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Column {
    id: string;
    title: string;
}

interface ProjectWorkflowEditorProps {
    projectId: string;
}

export function ProjectWorkflowEditor({ projectId }: ProjectWorkflowEditorProps) {
    const utils = trpc.useUtils();
    const { data: project, isLoading } = trpc.pmProjects.list.useQuery(); 
    // Usually we should have a getById for projects too, but list returns them all for now.
    
    const currentProject = project?.find((p: any) => p.id === projectId);
    
    const [columns, setColumns] = useState<Column[]>(() => {
        const workflow = (currentProject?.workflow as any);
        return workflow?.columns || [
            { id: "TODO", title: "To Do" },
            { id: "IN_PROGRESS", title: "In Progress" },
            { id: "DONE", title: "Done" }
        ];
    });

    const updateWorkflow = trpc.pmProjects.updateWorkflow.useMutation({
        onSuccess: () => {
            utils.pmProjects.list.invalidate();
        }
    });

    const handleAddColumn = () => {
        const id = `col-${Date.now()}`;
        setColumns([...columns, { id, title: "New Column" }]);
    };

    const handleRemoveColumn = (id: string) => {
        setColumns(columns.filter(c => c.id !== id));
    };

    const handleTitleChange = (id: string, title: string) => {
        setColumns(columns.map(c => c.id === id ? { ...c, title } : c));
    };

    const handleSave = () => {
        updateWorkflow.mutate({
            id: projectId,
            workflow: { columns }
        });
    };

    if (isLoading || !currentProject) {
        return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;
    }

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    Board Workflow Configuration
                </CardTitle>
                <CardDescription>
                    Customize the columns for your project board. These define the statuses an issue can have.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    {columns.map((column, index) => (
                        <div key={column.id} className="flex items-center gap-3 bg-muted/30 p-3 rounded-lg border border-border group">
                            <GripVertical className="text-muted-foreground w-4 h-4 cursor-grab" />
                            <div className="font-mono text-[10px] bg-muted px-2 py-1 rounded text-muted-foreground">
                                {column.id}
                            </div>
                            <Input 
                                value={column.title}
                                onChange={(e) => handleTitleChange(column.id, e.target.value)}
                                className="flex-1 h-9"
                            />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveColumn(column.id)}
                                className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                    <Button variant="outline" size="sm" onClick={handleAddColumn} className="flex items-center gap-2">
                        <Plus className="w-4 h-4" /> Add Column
                    </Button>
                    <Button onClick={handleSave} disabled={updateWorkflow.isPending} className="flex items-center gap-2">
                        {updateWorkflow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Save Changes
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
