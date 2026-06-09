import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { coerceLandingContent, defaultLandingContent } from "@/lib/landing";
import { StudioLanding } from "@/components/landing/StudioLanding";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const studio = await db.studio.findUnique({ where: { slug }, select: { name: true } });
  return { title: studio ? studio.name : "Studio" };
}

export default async function StudioLandingPage({ params }: PageProps) {
  const { slug } = await params;

  const studio = await db.studio.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      logoUrl: true,
      primaryColor: true,
      accentColor: true,
      landingContent: true,
    },
  });

  // Nur aktive Studios sind öffentlich sichtbar.
  if (!studio || studio.status !== "ACTIVE") notFound();

  // Aktive Standorte fürs Hero-Formular (Dropdown nur bei mehreren).
  const locations = await db.location.findMany({
    where: { studioId: studio.id, active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, city: true },
  });

  const content = coerceLandingContent(studio.landingContent) ?? defaultLandingContent(studio.name);

  return (
    <StudioLanding
      studio={{
        name: studio.name,
        slug: studio.slug,
        logoUrl: studio.logoUrl,
        primaryColor: studio.primaryColor,
        accentColor: studio.accentColor,
      }}
      content={content}
      locations={locations}
    />
  );
}
