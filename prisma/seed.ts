import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const DEFAULT_PHRASES = [
  { text: "On va mettre en place un process", emoji: "📋" },
  { text: "Il faudrait un meeting pour ça", emoji: "📅" },
  { text: "On est alignés ?", emoji: "🎯" },
  { text: "Quick win", emoji: "⚡" },
  { text: "Synergies", emoji: "🤝" },
  { text: "Move the needle", emoji: "📈" },
  { text: "On va débriefer", emoji: "💬" },
  { text: "Disruption", emoji: "💥" },
  { text: "Best practices", emoji: "✅" },
  { text: "Vision 360°", emoji: "🔭" },
  { text: "Mettre en silo", emoji: "🏗️" },
  { text: "Valeur ajoutée", emoji: "💎" },
  { text: "Roadmap", emoji: "🗺️" },
  { text: "Stakeholders", emoji: "👥" },
  { text: "Deep dive", emoji: "🤿" },
  { text: "On revient dessus offline", emoji: "📴" },
  { text: "Vous pouvez couper votre micro", emoji: "🔇" },
  { text: "Est-ce que tu m'entends ?", emoji: "👂" },
  { text: "Je suis en double booking", emoji: "📆" },
  { text: "On va jouer collectif", emoji: "⚽" },
  { text: "Leverage", emoji: "🔧" },
  { text: "Paradigm shift", emoji: "🔄" },
  { text: "Onboarding", emoji: "🚀" },
  { text: "KPIs", emoji: "📊" },
  { text: "Bootcamp", emoji: "🏕️" },
  { text: "Low hanging fruit", emoji: "🍎" },
  { text: "Agile", emoji: "🏃" },
  { text: "Sprint", emoji: "⏱️" },
  { text: "Rétrospective", emoji: "🔍" },
  { text: "Deliverable", emoji: "📦" },
  { text: "On va monter en compétences", emoji: "📚" },
  { text: "Scalable", emoji: "📐" },
  { text: "Pain point", emoji: "😣" },
  { text: "User journey", emoji: "🗺️" },
  { text: "Game changer", emoji: "🎮" },
];

async function seedPhrases() {
  console.log("🌱 Seeding default phrases...");
  for (const phrase of DEFAULT_PHRASES) {
    const id = `default-${phrase.text.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}`;
    await prisma.phrase.upsert({
      where: { id },
      update: {},
      create: { id, text: phrase.text, emoji: phrase.emoji, isDefault: true },
    });
  }
  console.log(`✅ ${DEFAULT_PHRASES.length} phrases chargées`);
}

async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || "Admin";

  if (!adminEmail || !adminPassword) {
    console.log("ℹ️  ADMIN_EMAIL / ADMIN_PASSWORD non définis — admin ignoré");
    return;
  }

  if (adminPassword.length < 12) {
    throw new Error("ADMIN_PASSWORD doit faire au moins 12 caractères");
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (existing) {
    if (!existing.isAdmin) {
      await prisma.user.update({ where: { email: adminEmail }, data: { isAdmin: true } });
      console.log(`✅ Utilisateur existant ${adminEmail} promu admin`);
    } else {
      console.log(`ℹ️  Admin ${adminEmail} existe déjà`);
    }
    return;
  }

  const hashedPassword = await hash(adminPassword, 12);
  await prisma.user.create({
    data: {
      name: adminName,
      email: adminEmail.toLowerCase().trim(),
      password: hashedPassword,
      isAdmin: true,
    },
  });

  console.log(`✅ Admin créé : ${adminEmail}`);
}

async function main() {
  await seedPhrases();
  await seedAdmin();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
