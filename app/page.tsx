import ChessBoard from "@/components/chess-board"

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-zinc-900 text-zinc-100">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-center">
        <h1 className="text-3xl font-bold mb-8 text-white tracking-tight">Chess</h1>
        <ChessBoard />
      </div>
    </main>
  )
}
