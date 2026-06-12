import ApiStatus from "@/components/ApiStatus";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold text-zinc-900">
          Conor Chess Engine
        </h1>

        <div className="mt-2">
          <ApiStatus />
        </div>
      </div>
    </main>
  );
}
