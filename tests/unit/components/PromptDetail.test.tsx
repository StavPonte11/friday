import { render, screen } from '@testing-library/react';
import { PromptDetail } from '@/components/prompts/prompt-detail';

describe('PromptDetail Component', () => {
    it('renders correctly with given prompt name', () => {
        render(<PromptDetail promptName="test-prompt" />);
        expect(screen.getByText('Prompt: test-prompt')).toBeInTheDocument();
    });

    it('renders diff differences logic', () => {
        render(<PromptDetail promptName="test-prompt" />);
        // "You are an AI assistant." was removed (-), "You are a senior AI assistant." added (+)
        // Find text content containing the diff prefixes
        expect(screen.getByText(/- You are an AI assistant./)).toBeInTheDocument();
        expect(screen.getByText(/\+ You are a senior AI assistant./)).toBeInTheDocument();
    });

    it('renders variable schema badges', () => {
        render(<PromptDetail promptName="test-prompt" />);
        expect(screen.getByText('user_name (string)')).toBeInTheDocument();
    });
});
