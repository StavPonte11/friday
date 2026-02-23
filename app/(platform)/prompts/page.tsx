import { PromptCatalog } from "@/components/prompts/prompt-catalog";
import { PromptDetail } from "@/components/prompts/prompt-detail";
import { MergeHistoryPanel } from "@/components/prompts/merge-history-panel";
import { ConflictResolutionPanel } from "@/components/prompts/conflict-resolution";

export default function PromptsPage() {
    return (
        <main className="container mx-auto p-4 md:p-6 lg:p-8 space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Prompt Management</h1>
                <p className="text-muted-foreground">Manage templates, view version history, and resolve automated merge conflicts.</p>
            </div>

            <section>
                <ConflictResolutionPanel />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <section className="space-y-6">
                    <PromptCatalog />
                    <MergeHistoryPanel />
                </section>

                <section>
                    {/* Typically this would be rendered on route /prompts/[name] or driven by selection state. */}
                    {/* For demonstration, we show it side-by-side or stacked on mobile. */}
                    <PromptDetail promptName="system-default-prompt" />
                </section>
            </div>
        </main>
    );
}
