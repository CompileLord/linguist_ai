'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error);
  }, [error]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-red-50 p-4 text-center">
      <h2 className="mb-4 text-2xl font-bold text-red-600">Something went wrong!</h2>
      <p className="mb-8 text-gray-700">{error.message}</p>
      <button
        onClick={() => reset()}
        className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition"
      >
        Try again
      </button>
    </div>
  );
}
