import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import readline from "readline/promises";

const prisma = new PrismaClient();

async function main() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const email = (await rl.question("Admin-E-Mail: ")).trim().toLowerCase();
  const password = await rl.question("Passwort (mind. 12 Zeichen): ");
  const name = (await rl.question("Name (optional): ")).trim() || null;

  rl.close();

  if (!email.includes("@")) {
    console.error("✗ Ungültige E-Mail-Adresse.");
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("✗ Passwort muss mindestens 12 Zeichen haben.");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash, name },
    create: { email, passwordHash, name },
  });

  console.log(`\n✓ Admin angelegt/aktualisiert: ${email}`);
  console.log("  Login auf /admin/login");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
