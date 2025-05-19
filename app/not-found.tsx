import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <h1 className="text-6xl font-bold mb-4">404</h1>
      <p className="mb-8 text-lg">Sorry, we couldn't find that page.</p>
      <Link href="/" className="btn btn-primary">
        Go back home
      </Link>
    </div>
  );
}
