import prisma from "../../lib/prisma";
import { config } from "dotenv";
config({ path: "../../.env" });




async function main() {
    console.log("🌱 Seeding database...");

    // Ensure a default workspace exists
    const workspace = await prisma.workspace.upsert({
        where: { slug: "default" },
        update: {},
        create: {
            name: "Default Workspace",
            slug: "default",
        },
    });

    console.log(`✅ Workspace ready: ${workspace.name} (${workspace.id})`);
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
