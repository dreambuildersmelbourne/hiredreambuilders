import { Link } from "@tanstack/react-router";
import { Church } from "lucide-react";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Church className="h-5 w-5" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">
            Dreambuilders <span className="text-muted-foreground font-normal">Venue Hire</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            to="/"
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            Home
          </Link>
          <Link
            to="/quote"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Get a quote
          </Link>
        </nav>
      </div>
    </header>
  );
}
