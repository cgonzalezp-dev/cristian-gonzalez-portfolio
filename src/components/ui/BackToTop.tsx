import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/utils/cn";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 800);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <a
      href="#top"
      aria-label="Back to top"
      className={cn(
        "fixed bottom-6 right-6 z-40 rounded-full bg-ink-900 dark:bg-white/10 p-3 text-paper-50 shadow-softLg backdrop-blur transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "pointer-events-none opacity-0 translate-y-4",
      )}
    >
      <ArrowUp className="h-4 w-4" />
    </a>
  );
}
