import { redirect } from "next/navigation";
import { getPlatformSession } from "@/lib/platformAuth";
import { PlatformLoginForm } from "./PlatformLoginForm";

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function PlatformLoginPage({ searchParams }: PageProps) {
  const session = await getPlatformSession();
  if (session) redirect("/platform");

  const { from } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <p className="label mb-6">Platform · Betreiber-Login</p>
        <h1 className="text-display text-4xl leading-[1] mb-10">Plattform</h1>
        <PlatformLoginForm redirectTo={from || "/platform"} />
      </div>
    </main>
  );
}
