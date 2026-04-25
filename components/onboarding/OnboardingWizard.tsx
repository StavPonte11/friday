"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Rocket, Briefcase, Frame } from "lucide-react";
import { useRouter } from "next/navigation";

interface OnboardingWizardProps {
    open: boolean;
}

export function OnboardingWizard({ open }: OnboardingWizardProps) {
    const [step, setStep] = useState(1);
    const [workspaceName, setWorkspaceName] = useState("");
    const [projectName, setProjectName] = useState("");

    const router = useRouter();

    const createWorkspace = trpc.workspaces.create.useMutation();
    const createProject = trpc.pmProjects.create.useMutation();

    const handleNext = async () => {
        if (step === 1) {
            if (!workspaceName.trim()) return;
            setStep(2);
        } else if (step === 2) {
            if (!projectName.trim()) return;
            setStep(3); // Moving to processing
            
            try {
                // 1. Create Workspace
                const ws = await createWorkspace.mutateAsync({ name: workspaceName });
                
                // 2. Create Project
                await createProject.mutateAsync({ 
                    workspaceId: ws.id, 
                    name: projectName, 
                    key: projectName.substring(0, 3).toUpperCase() 
                });

                // Set cookie and reload to enter the workspace
                document.cookie = `friday_workspace_id=${ws.id}; path=/; max-age=31536000`;
                router.push("/en/pm/dashboard");
                window.location.reload();
            } catch (err) {
                console.error("Onboarding failed", err);
                setStep(2); // Go back on error
            }
        }
    };

    return (
        <Dialog open={open}>
            <DialogContent className="sm:max-w-[450px]" showCloseButton={false}>
                <DialogHeader className="text-center sm:text-center pb-4">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                            {step === 1 ? <Briefcase className="w-6 h-6 text-primary" /> : <Frame className="w-6 h-6 text-primary" />}
                        </div>
                    </div>
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        {step === 1 ? "Welcome to FRIDAY" : step === 2 ? "Your First Project" : "Setting things up..."}
                    </DialogTitle>
                    <DialogDescription className="text-center mx-auto max-w-[300px]">
                        {step === 1 ? "Let's start by setting up your organization's workspace." : 
                         step === 2 ? "Every great product starts with a project. What are we building?" : 
                         "Hang tight, we are initializing your execution os."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="workspaceName">Workspace Name</Label>
                                <Input 
                                    id="workspaceName" 
                                    placeholder="e.g. Stark Industries" 
                                    value={workspaceName} 
                                    onChange={(e) => setWorkspaceName(e.target.value)} 
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="projectName">Project Name</Label>
                                <Input 
                                    id="projectName" 
                                    placeholder="e.g. Mark VII Armor" 
                                    value={projectName} 
                                    onChange={(e) => setProjectName(e.target.value)} 
                                    autoFocus
                                    onKeyDown={(e) => e.key === "Enter" && handleNext()}
                                />
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex flex-col items-center justify-center py-6 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <div className="text-sm text-muted-foreground animate-pulse">Running setup sequence...</div>
                        </div>
                    )}
                </div>

                {step < 3 && (
                    <DialogFooter>
                        <Button className="w-full" onClick={handleNext} disabled={step === 1 ? !workspaceName.trim() : !projectName.trim()}>
                            {step === 1 ? "Continue" : "Create & Enter FRIDAY"}
                        </Button>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}

