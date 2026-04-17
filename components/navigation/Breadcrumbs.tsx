"use client";

import React, { useMemo } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export function Breadcrumbs() {
    const pathname = usePathname();

    const segments = useMemo(() => {
        if (!pathname) return [];

        // Split and remove locale & module prefix logic
        const rawSegments = pathname.split("/").filter(Boolean);

        // This is a naive way to skip locale (e.g. 'en') and 'pm' route 
        // to show meaningful breadcrumbs. Adjust based on exact URL structure.
        return rawSegments.map((segment, index) => {
            const href = "/" + rawSegments.slice(0, index + 1).join("/");

            // Format segment string (e.g. "issues" -> "Issues", "cmmp..." -> "cmmp...")
            const title = segment.charAt(0).toUpperCase() + segment.slice(1);

            return {
                title,
                href,
                isLast: index === rawSegments.length - 1,
            };
        });
    }, [pathname]);

    if (segments.length === 0) return null;

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {segments.map((segment, idx) => (
                    <React.Fragment key={segment.href}>
                        <BreadcrumbItem>
                            {segment.isLast ? (
                                <BreadcrumbPage>{segment.title}</BreadcrumbPage>
                            ) : (
                                <BreadcrumbLink asChild>
                                    <Link href={segment.href}>{segment.title}</Link>
                                </BreadcrumbLink>
                            )}
                        </BreadcrumbItem>
                        {!segment.isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                ))}
            </BreadcrumbList>
        </Breadcrumb>
    );
}
