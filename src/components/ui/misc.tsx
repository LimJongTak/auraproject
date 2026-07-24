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
    <nav className="flex items-center gap-1.5 text-sm text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-border">/</span>}
          {item.href ? (
            <a href={item.href} className="hover:text-primary">
              {item.label}
            </a>
          ) : (
            <span className={i === items.length - 1 ? "font-medium text-foreground" : ""}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
