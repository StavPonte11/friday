import { prisma } from "../lib/prisma";

async function main() {
  const userId = "cmoe5seiv0000q6ljdtm2ewyu";
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  console.log("User:", user);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
