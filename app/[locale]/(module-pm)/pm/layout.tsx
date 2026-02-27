import React from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(props: { params: Promise<{ locale: string }> }) {
    const params = await props.params;
    const { locale } = params;
    const t = await getTranslations({ locale, namespace: "Shell" });
    return {
        title: "Friday PM",
    };
}

export default function PmLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground">
            <header className="flex h-14 items-center gap-4 border-b border-border px-6 bg-card shrink-0">
                <h1 className="text-lg font-semibold tracking-tight">Friday PM</h1>
            </header>
            <main className="flex-1 overflow-hidden relative">
                {children}
            </main>
        </div>
    );
}
