"use client";

import React from "react";
import { TRPCProvider } from "@/components/providers/trpc-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "next-auth/react";

export function AppProviders({ children }: { children: React.ReactNode }) {
    return (
        <SessionProvider>
            <TRPCProvider>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="dark"
                    enableSystem
                    disableTransitionOnChange
                >
                    {children}
                </ThemeProvider>
            </TRPCProvider>
        </SessionProvider>
    );
}
