"use client";

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { httpBatchLink } from '@trpc/client';
import React, { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc/client';
import superjson from 'superjson';

export function TRPCProvider({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient({
        defaultOptions: {
            queries: {
                gcTime: 1000 * 60 * 60 * 24, // 24 hours
                staleTime: 1000 * 60 * 5, // 5 minutes
                networkMode: 'offlineFirst',
            },
            mutations: {
                networkMode: 'offlineFirst',
            }
        }
    }));

    const [trpcClient] = useState(() =>
        trpc.createClient({
            links: [
                httpBatchLink({
                    url: '/api/trpc',
                    transformer: superjson,
                }),
            ],
        }),
    );

    const [persister, setPersister] = useState<any>(null);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setPersister(createSyncStoragePersister({
                storage: window.localStorage,
            }));
        }
    }, []);

    return (
        <trpc.Provider client={trpcClient} queryClient={queryClient}>
            {persister ? (
                <PersistQueryClientProvider client={queryClient} persistOptions={{ persister }}>
                    {children}
                </PersistQueryClientProvider>
            ) : (
                <QueryClientProvider client={queryClient}>
                    {children}
                </QueryClientProvider>
            )}
        </trpc.Provider>
    );
}
