// Utility for setting up & tearing down specialized testing data
// For use within Playwright hooks

export async function resetTestDatabase() {
    // In CI or isolated test environments, reset the Database
    // Or clear specific tables:
    // await prisma.pmIssue.deleteMany({ where: { title: { startsWith: '[TEST]' } }});
}

export async function createIsolatedTestProject() {
    // Generates a mock project for isolation tests
    return { id: 'test-project-123' };
}
