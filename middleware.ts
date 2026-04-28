import createMiddleware from 'next-intl/middleware';
import { withAuth } from "next-auth/middleware";
import { NextResponse } from 'next/server';

const intlMiddleware = createMiddleware({
    locales: ['en', 'he'],
    defaultLocale: 'en'
});

export default withAuth(
    function middleware(req) {
        // Run intl middleware
        return intlMiddleware(req);
    },
    {
        callbacks: {
            authorized: ({ req, token }) => {
                const path = req.nextUrl.pathname;
                
                // Allow public routes (auth, api, webhooks)
                if (path.includes('/auth/login') || 
                    path.includes('/api/auth') || 
                    path.includes('/api/webhooks')) {
                    return true;
                }

                // If no token and it's a private route, block
                if (!token) return false;

                // All authenticated users can access all routes
                // Fine-grained access control is enforced at the tRPC procedure level
                return true;
            }
        },
        pages: {
            signIn: '/en/auth/login', // Simple default, will be prefixed correctly by intl
        }
    }
);

export const config = {
    // Match only internationalized pathnames, exclude static files like images
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};
