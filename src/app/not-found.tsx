import { ButtonLink } from "@/components/ui/Button";
import { S } from "@/lib/strings";

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-screen place-items-center px-4">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <span className="text-6xl font-bold text-primary">404</span>
        <h1 className="text-2xl font-bold">{S.errors.notFoundTitle}</h1>
        <p className="text-muted">{S.errors.notFoundBody}</p>
        <ButtonLink href="/">{S.errors.backHome}</ButtonLink>
      </div>
    </main>
  );
}
