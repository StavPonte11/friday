import { fetchGitLabAPI, postGitLabMRComment } from '@/lib/gitlab';
import { gitlabErrorHandlers } from '../../msw/handlers/gitlab.handlers';
import { server } from '../../msw/server';

describe('gitlab client', () => {
    describe('postGitLabMRComment', () => {
        it('successfully posts a comment', async () => {
            const response = await postGitLabMRComment(1, 7, 'Test comment');
            expect(response).toBeDefined();
            expect(response.id).toBe(101);
            expect(response.body).toBe('Test comment');
        });

        it('throws GitLab API Error on non-2xx response', async () => {
            server.use(gitlabErrorHandlers.unauthorized);
            await expect(postGitLabMRComment(1, 7, 'Test')).rejects.toThrow(/GitLab API Error: 401/);
        });
    });

    describe('fetchGitLabAPI', () => {
        it('fetches MR details successfully', async () => {
            const response = await fetchGitLabAPI('/projects/1/merge_requests/7');
            expect(response.iid).toBe(7);
            expect(response.state).toBe('merged');
        });
    });
});
