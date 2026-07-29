"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createQuickLink,
  deleteQuickLink,
  setQuickLinkOrder,
  subscribeQuickLinks,
  updateQuickLink,
  type QuickLinkInput,
} from "@/lib/firestore/quickLinks";
import { DEFAULT_QUICK_LINK_ICON, QUICK_LINK_ICONS } from "@/lib/constants/quickLinkIcons";
import type { QuickLink, QuickLinkContentKey, QuickLinkIcon } from "@/types/models";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { ErrorText } from "@/components/ui/misc";
import { AdminPageHeader } from "@/components/admin/PageHeader";
import { cn } from "@/lib/utils/cn";

export default function AdminQuickLinksPage() {
  const [links, setLinks] = useState<QuickLink[]>([]);
  const [editing, setEditing] = useState<QuickLink | "new" | null>(null);

  useEffect(() => {
    const unsub = subscribeQuickLinks(setLinks);
    return () => unsub();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("이 버튼을 삭제할까요?")) return;
    await deleteQuickLink(id);
  }

  async function handleMove(index: number, direction: -1 | 1) {
    const target = links[index + direction];
    const current = links[index];
    if (!target) return;
    await Promise.all([
      setQuickLinkOrder(current.id, target.order),
      setQuickLinkOrder(target.id, current.order),
    ]);
  }

  return (
    <div className="max-w-2xl">
      <AdminPageHeader
        title="퀵메뉴 관리"
        description="화면 오른쪽에 떠있는 바로가기 버튼이에요 (PC 화면에서만 보여요)."
        action={
          <Button size="sm" onClick={() => setEditing("new")}>
            <Plus size={16} /> 새 버튼
          </Button>
        }
      />

      {editing && (
        <QuickLinkForm
          initial={editing === "new" ? null : editing}
          nextOrder={links.length}
          onDone={() => setEditing(null)}
        />
      )}

      <ul className="mt-6 flex flex-col gap-3">
        {links.map((link, i) => {
          const { Icon } = QUICK_LINK_ICONS[link.icon] ?? QUICK_LINK_ICONS[DEFAULT_QUICK_LINK_ICON];
          return (
            <li key={link.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-white p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary-dark">
                  <Icon size={18} />
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold">{link.label}</p>
                    {link.contentKey && (
                      <span className="rounded-full bg-primary-light px-2 py-0.5 text-xs font-semibold text-primary-dark">
                        안내 카드
                      </span>
                    )}
                    {!link.isActive && (
                      <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-muted">비활성</span>
                    )}
                  </div>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 truncate text-xs text-muted hover:text-primary"
                    >
                      {link.url} <ExternalLink size={11} className="shrink-0" />
                    </a>
                  ) : (
                    <p className="text-xs text-muted">연결 URL 없음</p>
                  )}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => handleMove(i, -1)}
                  disabled={i === 0}
                  className="text-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => handleMove(i, 1)}
                  disabled={i === links.length - 1}
                  className="text-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-30"
                >
                  <ArrowDown size={16} />
                </button>
                <button onClick={() => setEditing(link)} className="ml-2 text-muted hover:text-primary">
                  <Pencil size={16} />
                </button>
                <button onClick={() => handleDelete(link.id)} className="text-muted hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </li>
          );
        })}
        {links.length === 0 && !editing && (
          <p className="py-10 text-center text-sm text-muted">등록된 퀵메뉴 버튼이 없어요.</p>
        )}
      </ul>
    </div>
  );
}

function QuickLinkForm({
  initial,
  nextOrder,
  onDone,
}: {
  initial: QuickLink | null;
  nextOrder: number;
  onDone: () => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? "");
  const [url, setUrl] = useState(initial?.url ?? "");
  const [icon, setIcon] = useState<QuickLinkIcon>(initial?.icon ?? DEFAULT_QUICK_LINK_ICON);
  const [contentKey, setContentKey] = useState<QuickLinkContentKey | null>(initial?.contentKey ?? null);
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) {
      setError("버튼 이름을 입력해주세요");
      return;
    }
    let normalizedUrl = url.trim();
    // Info-card buttons don't navigate anywhere, so the URL is only used for
    // an optional "바로가기" link inside the card — leaving it blank is fine.
    if (normalizedUrl || !contentKey) {
      if (!/^https?:\/\//.test(normalizedUrl)) normalizedUrl = `https://${normalizedUrl}`;
      try {
        new URL(normalizedUrl);
      } catch {
        setError("올바른 URL을 입력해주세요");
        return;
      }
    }

    setSubmitting(true);
    setError(null);
    const input: QuickLinkInput = {
      label: label.trim(),
      url: normalizedUrl,
      icon,
      contentKey,
      order: initial?.order ?? nextOrder,
      isActive,
    };
    try {
      if (initial) {
        await updateQuickLink(initial.id, input);
      } else {
        await createQuickLink(input);
      }
      onDone();
    } catch {
      setError("저장에 실패했어요");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-white p-5">
      <Input label="버튼 이름" placeholder="예: 전자책" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={20} />
      <Input
        label={contentKey ? "연결 URL (안내 카드의 \"바로가기\" 버튼에 사용돼요)" : "연결 URL"}
        placeholder="https://example.com"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">아이콘</span>
        <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
          {(Object.entries(QUICK_LINK_ICONS) as [QuickLinkIcon, (typeof QUICK_LINK_ICONS)[QuickLinkIcon]][]).map(
            ([key, { label: iconLabel, Icon }]) => (
              <button
                key={key}
                type="button"
                title={iconLabel}
                onClick={() => setIcon(key)}
                className={cn(
                  "flex items-center justify-center rounded-xl border p-2.5 transition",
                  icon === key
                    ? "border-primary bg-primary-light text-primary-dark"
                    : "border-border text-muted hover:border-primary/40"
                )}
              >
                <Icon size={18} />
              </button>
            )
          )}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={contentKey === "aura-mileage"}
          onChange={(e) => setContentKey(e.target.checked ? "aura-mileage" : null)}
        />
        클릭 시 링크 이동 대신 AURA 마일리지 안내 카드를 표시
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        화면에 노출
      </label>
      {error && <ErrorText>{error}</ErrorText>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onDone}>
          취소
        </Button>
        <Button type="submit" size="sm" loading={submitting}>
          저장
        </Button>
      </div>
    </form>
  );
}
