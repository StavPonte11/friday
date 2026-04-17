"use client";

import React, { Component, type ReactNode } from "react";

interface State {
    hasError: boolean;
    error?: Error;
}

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * React Error Boundary that captures frontend errors and sends them
 * to /api/errors for DB-backed logging.
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // Log to server
        fetch("/api/errors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message: error.message,
                stack: error.stack,
                componentStack: info.componentStack,
                url: window.location.href,
                timestamp: new Date().toISOString(),
            }),
        }).catch(console.error);
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 dark:border-red-900/30 dark:bg-red-900/10">
                    <div className="text-center">
                        <div className="text-2xl mb-2">⚡</div>
                        <h3 className="text-sm font-semibold text-red-700 dark:text-red-400">Something went wrong</h3>
                        <p className="text-xs text-red-500 mt-1 max-w-xs">{this.state.error?.message}</p>
                        <button
                            onClick={() => this.setState({ hasError: false })}
                            className="mt-3 text-xs text-red-600 underline hover:no-underline"
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
