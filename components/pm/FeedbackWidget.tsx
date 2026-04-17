"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { usePathname } from "next/navigation";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

export function FeedbackWidget() {
    const [open, setOpen] = useState(false);
    const [type, setType] = useState<"bug" | "feature" | "ux" | "other">("feature");
    const [message, setMessage] = useState("");
    const pathname = usePathname();
    const mutation = trpc.pmFeedback.submit.useMutation();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message) return;
        
        await mutation.mutateAsync({
            type,
            message,
            page: pathname
        });
        
        setOpen(false);
        setMessage("");
    };

    return (
        <>
            <div className="fixed bottom-4 right-4 z-50">
                <Button onClick={() => setOpen(true)} className="rounded-full shadow-lg">
                    Give Feedback
                </Button>
            </div>

            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Share your feedback</DrawerTitle>
                        <DrawerDescription>Help us improve F.R.I.D.A.Y.</DrawerDescription>
                    </DrawerHeader>
                    
                    <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4 max-w-sm mx-auto w-full">
                        <select 
                            value={type} 
                            onChange={e => setType(e.target.value as any)}
                            className="w-full p-2 border rounded-md bg-background"
                        >
                            <option value="bug">Report a Bug</option>
                            <option value="feature">Feature Request</option>
                            <option value="ux">UX/UI Issue</option>
                            <option value="other">Other</option>
                        </select>
                        
                        <textarea 
                            value={message}
                            onChange={e => setMessage(e.target.value)}
                            placeholder="What's on your mind?"
                            className="w-full p-2 border rounded-md min-h-[100px] bg-background"
                            required
                        />
                        
                        <DrawerFooter className="px-0">
                            <Button type="submit" disabled={mutation.isPending}>
                                {mutation.isPending ? "Submitting..." : "Submit"}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </form>
                </DrawerContent>
            </Drawer>
        </>
    );
}
