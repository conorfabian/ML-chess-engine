import ChessGame from "@/components/ChessGame";

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-100 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold text-zinc-900">
          Conor Chess Engine
        </h1>

        <ChessGame />
      </div>
    </main>
  );
}
