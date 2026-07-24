import Link from "next/link";
import { CalendarClock, ClipboardList, LayoutGrid, ShieldCheck, Users2 } from "lucide-react";
import { RequireAdmin } from "@/components/auth/Guard";

const CARDS = [
  {
    href: "/admin/banners",
    title: "배너 관리",
    desc: "대회별 배너 이미지, 신청시작·주제공개 카운트다운을 설정해요",
    icon: CalendarClock,
  },
  { href: "/admin/categories", title: "카테고리 관리", desc: "대회별 카테고리와 게시기간을 관리해요", icon: LayoutGrid },
  {
    href: "/admin/applicants",
    title: "신청자 관리",
    desc: "대회별 신청자 명단을 확인하고 CSV로 내려받아요",
    icon: ClipboardList,
  },
  { href: "/admin/exhibitions", title: "게시물 관리", desc: "전시물을 숨기거나 다시 공개해요", icon: ShieldCheck },
  { href: "/admin/users", title: "사용자 관리", desc: "관리자 권한을 부여하거나 해제해요", icon: Users2 },
];

export default function AdminHomePage() {
  return (
    <RequireAdmin>
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-2xl font-extrabold">관리자</h1>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {CARDS.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="flex items-start gap-4 rounded-2xl border border-border bg-white p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
            >
              <span className="rounded-xl bg-primary-light p-2.5 text-primary-dark">
                <card.icon size={20} />
              </span>
              <div>
                <p className="font-bold">{card.title}</p>
                <p className="mt-0.5 text-sm text-muted">{card.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </RequireAdmin>
  );
}
