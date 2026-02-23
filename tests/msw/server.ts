import { setupServer } from 'msw/node';
import { langfuseHandlers } from './handlers/langfuse.handlers';
import { gitlabHandlers } from './handlers/gitlab.handlers';

export const server = setupServer(
    ...langfuseHandlers,
    ...gitlabHandlers
);
