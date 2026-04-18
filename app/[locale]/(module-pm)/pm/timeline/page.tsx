import { getTranslations } from "next-intl/server";
import { TimelineManager } from "@/components/pm/timeline/TimelineManager";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const t = await getTranslations({ locale: params.locale, namespace: "pm" });
    return {
        title: "Timeline & Gantt",
    };
}

export default async function PmTimelinePage() {
    return (
        <div className="flex flex-col h-full w-full overflow-hidden bg-background">
            <TimelineManager />
        </div>
    );
}
