import { cn } from "@/lib/utils/cn";

export function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full bg-primary-light px-3 py-1 text-xs font-semibold text-primary-dark",
        className
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary",
        className
      )}
    />
  );
}

export function CenteredSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-muted">
      <Spinner className="h-8 w-8 border-[3px]" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-20 text-center">
      <p className="font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted">{description}</p>}
    </div>
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">{children}</p>;
}

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav className="flex min-w-0 items-center gap-1.5 text-sm text-muted">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className={cn("flex min-w-0 items-center gap-1.5", isLast && "flex-1")}>
            {i > 0 && <span className="shrink-0 text-border">/</span>}
            {item.href ? (
              <a href={item.href} className="shrink-0 hover:text-primary">
                {item.label}
              </a>
            ) : (
              // Only the current-page crumb (isLast) can be long (e.g. an
              // exhibition title) — truncate just that one so it never wraps
              // mid-word (CJK text wraps between any two characters by
              // default, unlike Latin script) while earlier, short crumbs
              // stay on one line.
              <span className={cn(isLast ? "truncate font-medium text-foreground" : "shrink-0")}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}
