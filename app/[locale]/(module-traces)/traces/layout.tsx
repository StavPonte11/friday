import React from "react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: "Traces" });
    return {
        title: t("title") || "Friday Traces",
    };
}

export default function TracesLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col h-full w-full bg-background text-foreground">
            <header className="flex h-14 items-center gap-4 border-b border-border px-6 bg-card">
                <h1 className="text-lg font-semibold">Friday Traces</h1>
            </header>
            <main className="flex-1 p-6 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
