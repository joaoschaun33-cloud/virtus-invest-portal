import { cn } from "@/lib/utils";

const BRAND_ASSETS = {
  light: {
    symbol: "/brand/S%C3%8DMBOLO%20.svg",
    wordmark: "/brand/VARIA%C3%87%C3%83O%202.svg",
  },
  dark: {
    symbol: "/brand/S%C3%8DMBOLO%20.svg",
    wordmark: "/brand/VARIA%C3%87%C3%83O%20.svg",
  },
} as const;

type VirtusBrandProps = {
  variant?: "symbol" | "wordmark";
  className?: string;
  alt?: string;
};

/**
 * Uses local SVGs: dark lettering for light surfaces and light lettering
 * for dark surfaces. The compact red symbol remains recognizable in both.
 */
export function VirtusBrand({
  variant = "wordmark",
  className,
  alt = "Virtus",
}: VirtusBrandProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center", className)}
      role="img"
      aria-label={alt}
    >
      <img
        src={BRAND_ASSETS.light[variant]}
        alt=""
        aria-hidden="true"
        className="h-full w-full object-contain dark:hidden"
      />
      <img
        src={BRAND_ASSETS.dark[variant]}
        alt=""
        aria-hidden="true"
        className="hidden h-full w-full object-contain dark:block"
      />
    </span>
  );
}

export { BRAND_ASSETS };
