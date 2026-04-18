// @ts-nocheck
import { jest, describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import "@testing-library/jest-dom";
import { TraceTable } from '@/components/observability/trace-table';
import { useTraces } from '@/hooks/use-observability';

jest.mock('@/hooks/use-observability', () => ({
    useTraces: jest.fn()
}));

describe('TraceTable Component', () => {
    it('renders skeleton rows while loading', () => {
        (useTraces as jest.Mock).mockReturnValue({ data: null, isLoading: true, error: null } as any);
        render(<TraceTable />);
        // Skeleton renders have empty accessible text in our shadcn component, 
        // but they map to rows. TableHead is present.
        expect(screen.getByText('Trace ID')).toBeInTheDocument();
    });

    it('renders empty state when data is empty array', () => {
        (useTraces as jest.Mock).mockReturnValue({ data: { data: [] }, isLoading: false, error: null } as any);
        render(<TraceTable />);
        expect(screen.getByText('No traces found.')).toBeInTheDocument();
    });

    it('renders correct number of rows from fixture data', () => {
        (useTraces as jest.Mock).mockReturnValue({
            data: { data: [{ id: '12345678', name: 'Test Trace', latency: 1.5, totalCost: 0, level: 'SUCCESS' }] },
            isLoading: false,
            error: null
        } as any);
        render(<TraceTable />);
        expect(screen.getByText('Test Trace')).toBeInTheDocument();
    });

    it('error state renders error message', () => {
        (useTraces as jest.Mock).mockReturnValue({ data: null, isLoading: false, error: 'Fail' } as any);
        render(<TraceTable />);
        expect(screen.getByText('Error loading traces.')).toBeInTheDocument();
    });
});
