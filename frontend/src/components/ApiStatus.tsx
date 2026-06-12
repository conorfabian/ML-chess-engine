"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
};

const DEFAULT_API_URL =
  process.env.NODE_ENV === "production"
    ? "https://ml-chess-engine.onrender.com"
    : "http://127.0.0.1:8000";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL).replace(
  /\/$/,
  "",
);

export default function ApiStatus() {
  const [status, setStatus] = useState("Checking API...");

  useEffect(() => {
    async function checkApi() {
      try {
        const response = await fetch(`${API_URL}/health`);

        if (!response.ok) {
          throw new Error(`Health request failed: ${response.status}`);
        }

        const data = (await response.json()) as HealthResponse;
        setStatus(
          data.status === "ok" ? "Engine API online" : "Unexpected API response",
        );
      } catch (error) {
        console.error(error);
        setStatus("Engine API offline");
      }
    }

    void checkApi();
  }, []);

  return <p className="text-sm text-zinc-600">{status}</p>;
}
