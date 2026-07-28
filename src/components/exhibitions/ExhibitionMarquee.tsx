import type { Exhibition } from "@/types/models";
import { ExhibitionCard } from "./ExhibitionCard";

// Once there are enough exhibitions that a static grid would just clip them,
// loop them through an infinite auto-scrolling strip instead — duplicated
// once so the CSS animation can seamlessly wrap at the halfway point.
export function ExhibitionMarquee({ exhibitions }: { exhibitions: Exhibition[] }) {
  const duration = exhibitions.length * 4.5;
  const track = [...exhibitions, ...exhibitions];

  return (
    <div className="group relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
      <div
        className="animate-marquee flex w-max gap-5 group-hover:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        {track.map((exhibition, i) => (
          <div key={`${exhibition.id}-${i}`} className="w-72 shrink-0 sm:w-80">
            <ExhibitionCard exhibition={exhibition} />
          </div>
        ))}
      </div>
    </div>
  );
}
