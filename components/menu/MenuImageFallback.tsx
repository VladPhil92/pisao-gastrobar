import Image from "next/image";
import { getMenuCategoryVisual } from "@/lib/menu/visual-language";

export function MenuImageFallback({
  name,
  categorySlug,
}: {
  name: string;
  categorySlug?: string | null;
}) {
  const visual = getMenuCategoryVisual(categorySlug);

  return (
    <div className="relative flex h-full w-full items-end overflow-hidden bg-[radial-gradient(circle_at_70%_18%,rgba(199,154,58,.2),transparent_30%),linear-gradient(145deg,#20170f_0%,#111111_52%,#1c1c1c_100%)] p-6">
      <div className="absolute -top-14 -right-10 size-44 rounded-full border border-pisao-gold/10" />
      <div className="absolute top-4 right-4 size-24 rounded-full border border-pisao-gold/10" />
      <div className="absolute top-8 left-6 opacity-70">
        <Image
          src="/brand/pisao-mark.png"
          alt=""
          width={62}
          height={62}
          className="h-14 w-14 object-contain"
        />
      </div>

      <div className="relative max-w-[15rem]">
        <p className="text-pisao-gold text-[10px] font-semibold tracking-[0.24em] uppercase">
          {visual.eyebrow}
        </p>
        <p className="font-display text-pisao-cream mt-2 text-2xl leading-tight">
          {name}
        </p>
        <p className="text-pisao-cream-muted mt-3 text-xs leading-relaxed">
          Imagen editorial en preparación · {visual.label}
        </p>
      </div>
    </div>
  );
}
