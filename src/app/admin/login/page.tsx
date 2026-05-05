import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

interface PageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const session = await getSession();
  if (session) redirect("/admin");

  const { from } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-6">
      <div className="w-full max-w-sm">
        <p className="label mb-6">Admin · Login</p>
        <h1 className="text-display text-4xl leading-[1] mb-10">Anmelden</h1>
        <LoginForm redirectTo={from || "/admin"} />
      </div>
    </main>
  );
}
