import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/server';
import { NextRequest } from 'next/server';
import { createTRPCContext } from '@/lib/trpc/init';

const handler = (req: NextRequest) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req,
        router: appRouter,
        createContext: () => createTRPCContext(),
    });

export { handler as GET, handler as POST };
