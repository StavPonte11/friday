import { defineConfig } from 'prisma/config'

export default defineConfig({
    schema: './packages/db/schema.prisma',
    datasource: {
        url: process.env.DATABASE_URL,
    },
})
