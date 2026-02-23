import { render, screen, fireEvent } from '@testing-library/react';
import { ConflictResolutionPanel } from '@/components/prompts/conflict-resolution';
import * as hooks from '@/hooks/use-prompts';

jest.mock('@/hooks/use-prompts');

describe('ConflictResolutionPanel Component', () => {
    it('renders nothing when there are no conflicts', () => {
        jest.spyOn(hooks, 'useConflicts').mockReturnValue({ data: [], isLoading: false } as any);
        const { container } = render(<ConflictResolutionPanel />);
        expect(container).toBeEmptyDOMElement();
    });

    it('renders conflict details when data is present', () => {
        jest.spyOn(hooks, 'useConflicts').mockReturnValue({
            data: [{ id: 1, promptName: 'test-prompt', prodVersion: 'v2', featVersion: 'v1' }],
            isLoading: false
        } as any);
        render(<ConflictResolutionPanel />);

        expect(screen.getByText('Action Required: Conflicts Detected')).toBeInTheDocument();
        expect(screen.getByText('Conflict in: test-prompt')).toBeInTheDocument();

        // Check buttons
        expect(screen.getByRole('button', { name: 'Accept Feature' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Accept Production' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Resolve Manually' })).toBeInTheDocument();
    });
});
