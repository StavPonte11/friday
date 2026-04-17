"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link2, Trash2 } from "lucide-react";

export function IssueLinksPanel({ issue, projectId }: { issue: any, projectId: string }) {
    const utils = trpc.useUtils();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedType, setSelectedType] = useState<string>("BLOCKS");
    
    const { data: searchResults, isLoading: isSearching } = trpc.pmIssues.search.useQuery(
        { query: searchQuery, limit: 10 },
        { enabled: searchQuery.length > 1 }
    );

    const addLink = trpc.pmIssues.addLink.useMutation({
        onSuccess: () => {
            utils.pmIssues.getById.invalidate({ id: issue.id });
            setSearchQuery("");
        }
    });

    const removeLink = trpc.pmIssues.removeLink.useMutation({
        onSuccess: () => {
            utils.pmIssues.getById.invalidate({ id: issue.id });
        }
    });

    const handleAddLink = (targetIssueId: string) => {
        addLink.mutate({
            sourceIssueId: issue.id,
            targetIssueId,
            type: selectedType as any
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h4 className="text-sm font-medium">Add Connection</h4>
                <div className="flex items-center gap-2">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-[160px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="BLOCKS">Blocks</SelectItem>
                            <SelectItem value="IS_BLOCKED_BY">Is Blocked By</SelectItem>
                            <SelectItem value="RELATES_TO">Relates To</SelectItem>
                            <SelectItem value="DUPLICATES">Duplicates</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input 
                        placeholder="Search issues by title or key..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                    />
                </div>
                
                {searchQuery.length > 1 && (
                    <div className="border rounded-md bg-card p-2 shadow-sm max-h-[200px] overflow-y-auto mt-2">
                        {isSearching ? (
                            <div className="flex justify-center p-4 text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /></div>
                        ) : searchResults?.length ? (
                            <div className="space-y-1">
                                {searchResults.filter(r => r.id !== issue.id).map(res => (
                                    <div key={res.id} className="flex items-center justify-between p-2 hover:bg-muted/50 rounded-md cursor-pointer" onClick={() => handleAddLink(res.id)}>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-mono font-bold">{res.key}</span>
                                            <span className="text-sm">{res.title}</span>
                                        </div>
                                        <Button size="sm" variant="ghost" disabled={addLink.isPending}>Connect</Button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground p-2">No issues found.</p>
                        )}
                    </div>
                )}
            </div>

            <div className="space-y-4 pt-4 border-t border-border mt-4">
                <h4 className="text-sm font-medium">Linked Issues</h4>
                {(!issue.sourceLinks?.length && !issue.targetLinks?.length) && (
                    <p className="text-sm text-muted-foreground italic">No linked issues.</p>
                )}
                
                <div className="space-y-2">
                    {issue.sourceLinks?.map((link: any) => (
                        <div key={link.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Link2 size={14} className="text-muted-foreground" />
                                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">{link.type.replace(/_/g, ' ')}</span>
                                <span className="text-xs font-mono font-bold ml-2">{link.targetIssue.key}</span>
                                <span className="text-sm">{link.targetIssue.title}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-8 h-8 p-0" onClick={() => removeLink.mutate({ id: link.id })}>
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    ))}
                    
                    {issue.targetLinks?.map((link: any) => (
                        <div key={link.id} className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/20">
                            <div className="flex items-center gap-2">
                                <Link2 size={14} className="text-muted-foreground" />
                                <span className="text-xs font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded uppercase tracking-wider">
                                    {link.type === 'BLOCKS' ? 'IS BLOCKED BY' : 
                                     link.type === 'IS_BLOCKED_BY' ? 'BLOCKS' : 
                                     link.type === 'DUPLICATES' ? 'IS DUPLICATE OF' : 
                                     'RELATES TO'}
                                </span>
                                <span className="text-xs font-mono font-bold ml-2">{link.sourceIssue.key}</span>
                                <span className="text-sm">{link.sourceIssue.title}</span>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-500/10 w-8 h-8 p-0" onClick={() => removeLink.mutate({ id: link.id })}>
                                <Trash2 size={14} />
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
