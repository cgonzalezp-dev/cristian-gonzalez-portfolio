import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { nav, person } from "@/data/content";
import { useScrollSpy } from "@/hooks/useScrollSpy";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/utils/cn";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const sectionIds = nav.map((item) => item.href.replace("#", ""));
  const activeId = useScrollSpy(sectionIds);
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-ink-900/[0.06] dark:border-white/[0.06] bg-paper-50/80 dark:bg-ink-900/80 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-content items-center justify-between px-6 sm:px-8" aria-label="Primary">
        <a href="#top" className="text-sm font-bold tracking-tight" onClick={() => setMenuOpen(false)}>
          {person.name}
        </a>

        <ul className="hidden items-center gap-6 md:flex">
          {nav.map((item) => {
            const id = item.href.replace("#", "");
            const isActive = activeId === id;
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors duration-200",
                    isActive
                      ? "text-brass-600 dark:text-brass-400"
                      : "text-ink-600 hover:text-ink-900 dark:text-paper-200/70 dark:hover:text-paper-50",
                  )}
                >
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-full p-2 text-ink-600 hover:bg-ink-900/5 dark:text-paper-200 dark:hover:bg-white/10 transition-colors"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Button variant="primary" href="#contact" className="hidden sm:inline-flex !px-4 !py-2 !text-xs">
            Contact
          </Button>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            className="rounded-full p-2 text-ink-600 hover:bg-ink-900/5 dark:text-paper-200 dark:hover:bg-white/10 transition-colors md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <div
        id="mobile-menu"
        className={cn(
          "overflow-hidden border-t border-ink-900/[0.06] dark:border-white/[0.06] bg-paper-50 dark:bg-ink-900 transition-[max-height] duration-300 ease-out md:hidden",
          menuOpen ? "max-h-96" : "max-h-0",
        )}
      >
        <ul className="flex flex-col gap-1 px-6 py-4">
          {nav.map((item) => (
            <li key={item.href}>
              <a
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="block py-2 text-sm font-medium text-ink-700 dark:text-paper-100/85"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </header>
  );
}
