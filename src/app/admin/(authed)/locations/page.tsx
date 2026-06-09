import Link from "next/link";
import { db } from "@/lib/db";
import { requireStudioId } from "@/lib/tenant";
import { saveLocation, toggleLocationActive, deleteLocation } from "@/app/admin/_actions";

interface PageProps {
  searchParams: Promise<{ edit?: string; new?: string }>;
}

export default async function LocationsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const editingId = sp.edit;
  const isNew = sp.new === "1";

  const studioId = await requireStudioId();
  const locations = await db.location.findMany({
    where: { studioId },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { contacts: true, plans: true } },
    },
  });
  const editingLocation = editingId ? locations.find((l) => l.id === editingId) : null;
  const showForm = isNew || !!editingLocation;

  return (
    <div className="p-8 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="label">Standorte</p>
          <h1 className="mt-2 text-display text-4xl">Studios verwalten</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Hier legst du deine Standorte an. Auf Landingpage und Anmeldeseite kann der Besucher
            zwischen aktiven Standorten wählen. Tarife können pro Standort oder allgemein gelten.
          </p>
        </div>
        {!showForm && (
          <Link
            href="/admin/locations?new=1"
            className="bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
          >
            + Neuer Standort
          </Link>
        )}
      </div>

      {showForm ? (
        <LocationForm location={editingLocation ?? null} />
      ) : (
        <div className="border border-ink/15">
          {locations.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted">
                Noch keine Standorte angelegt. Solange das so ist, läuft die App ohne
                Standortauswahl.
              </p>
              <Link
                href="/admin/locations?new=1"
                className="mt-6 inline-block bg-ink px-4 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
              >
                Ersten Standort anlegen →
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-ink/15 bg-ink/5">
                <tr className="text-left">
                  <Th>Name</Th>
                  <Th>Adresse</Th>
                  <Th>Kontakt</Th>
                  <Th>Kontakte</Th>
                  <Th>Tarife</Th>
                  <Th>Aktiv</Th>
                  <Th>Sort</Th>
                  <th></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {locations.map((l) => (
                  <tr key={l.id} className={l.active ? "" : "opacity-50"}>
                    <Td>
                      <p className="font-medium">{l.name}</p>
                    </Td>
                    <Td className="text-xs">
                      {l.street && <p>{l.street}</p>}
                      {(l.postalCode || l.city) && (
                        <p>
                          {l.postalCode} {l.city}
                        </p>
                      )}
                      {!l.street && !l.city && <span className="text-muted">—</span>}
                    </Td>
                    <Td className="text-xs">
                      {l.phone && <p className="font-mono">{l.phone}</p>}
                      {l.email && <p className="font-mono text-muted">{l.email}</p>}
                      {!l.phone && !l.email && <span className="text-muted">—</span>}
                    </Td>
                    <Td className="font-mono text-xs">{l._count.contacts}</Td>
                    <Td className="font-mono text-xs">{l._count.plans}</Td>
                    <Td>
                      <form action={toggleLocationActive.bind(null, l.id)}>
                        <button className="font-mono text-xs underline underline-offset-2">
                          {l.active ? "Aktiv" : "Inaktiv"}
                        </button>
                      </form>
                    </Td>
                    <Td className="font-mono text-xs">{l.sortOrder}</Td>
                    <Td className="text-right whitespace-nowrap">
                      <Link
                        href={`/admin/locations?edit=${l.id}`}
                        className="font-mono text-xs underline underline-offset-2 mr-3"
                      >
                        Bearbeiten
                      </Link>
                      <form action={deleteLocation.bind(null, l.id)} className="inline">
                        <button className="font-mono text-xs text-red-700 underline underline-offset-2">
                          Löschen
                        </button>
                      </form>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function LocationForm({
  location,
}: {
  location: Awaited<ReturnType<typeof db.location.findMany>>[number] | null;
}) {
  return (
    <form action={saveLocation} className="max-w-2xl space-y-6 border border-ink/15 p-6">
      {location && <input type="hidden" name="id" value={location.id} />}

      <h2 className="text-display text-2xl mb-4">
        {location ? "Standort bearbeiten" : "Neuer Standort"}
      </h2>

      <Field
        label="Name (intern und auf Landingpage sichtbar)"
        name="name"
        defaultValue={location?.name}
        required
        placeholder="z.B. Studio Bochum, Vital-Fit Ochtrup"
      />

      <div className="border-t border-ink/10 pt-6">
        <p className="label mb-4">Adresse (optional)</p>
        <Field label="Straße & Hausnummer" name="street" defaultValue={location?.street ?? ""} />
        <div className="mt-4 grid grid-cols-3 gap-4">
          <Field label="PLZ" name="postalCode" defaultValue={location?.postalCode ?? ""} />
          <div className="col-span-2">
            <Field label="Stadt" name="city" defaultValue={location?.city ?? ""} />
          </div>
        </div>
      </div>

      <div className="border-t border-ink/10 pt-6">
        <p className="label mb-4">Kontakt (optional)</p>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Telefon" name="phone" type="tel" defaultValue={location?.phone ?? ""} />
          <Field label="E-Mail" name="email" type="email" defaultValue={location?.email ?? ""} />
        </div>
      </div>

      <div className="border-t border-ink/10 pt-6 grid grid-cols-2 gap-4">
        <Field
          label="Sortierung"
          name="sortOrder"
          type="number"
          defaultValue={String(location?.sortOrder ?? 0)}
        />
        <label className="flex items-end gap-2 pb-2">
          <input
            type="checkbox"
            name="active"
            defaultChecked={location?.active ?? true}
            className="h-4 w-4 accent-ink"
          />
          <span className="text-sm">Aktiv (auf Website auswählbar)</span>
        </label>
      </div>

      <div className="flex gap-3 pt-4 border-t border-ink/10">
        <button
          type="submit"
          className="bg-ink px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] text-acid hover:bg-ink-soft"
        >
          Speichern
        </button>
        <a
          href="/admin/locations"
          className="border border-ink/20 px-6 py-2 font-mono text-xs uppercase tracking-[0.12em] hover:bg-ink/5"
        >
          Abbrechen
        </a>
      </div>
    </form>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-4 py-3 ${className}`}>{children}</td>;
}

function Field({
  label,
  name,
  type = "text",
  defaultValue,
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label mb-2 block">{label}</span>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="w-full border-b-2 border-ink bg-transparent py-2 text-base outline-none focus:border-acid_dark"
      />
    </label>
  );
}
