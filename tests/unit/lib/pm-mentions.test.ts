// Using Jest globals

function extractMentions(text: string) {
    const mentions = text.match(/@(\w+)/g) || [];
    return mentions.map(m => m.slice(1));
}

describe('Mention Extraction', () => {
    test('extracts single mention', () => {
        const result = extractMentions('Hello @alice how are you?');
        expect(result).toEqual(['alice']);
    });

    test('extracts multiple mentions', () => {
        const result = extractMentions('@bob and @charlie please review.');
        expect(result).toEqual(['bob', 'charlie']);
    });

    test('handles no mentions', () => {
        const result = extractMentions('No mentions here.');
        expect(result).toEqual([]);
    });
});
