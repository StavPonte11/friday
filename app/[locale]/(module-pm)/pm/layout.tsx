import React from "react";
import { getTranslations } from "next-intl/server";
import { OnboardingFlow } from "@/components/pm/OnboardingFlow";
import Link from "next/link";
import { BookOpen } from "lucide-react";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: "Shell" });
    return {
        title: "Friday PM",
    };
}

export default async function PmLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    const { children } = props;

    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground">
            <header className="flex h-14 items-center border-b border-border px-6 bg-card shrink-0">
                <h1 className="text-lg font-semibold tracking-tight">Friday PM</h1>
                <Link href={`/${locale}/docs/pm`} className="ml-auto flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors bg-muted/30 px-2 py-1.5 rounded-lg border border-transparent hover:border-border">
                    <BookOpen size={14} className="text-primary/70" />
                    Documentation
                </Link>
            </header>
            <main className="flex-1 overflow-hidden relative">
                {children}
                <OnboardingFlow />
            </main>
        </div>
    );
}
