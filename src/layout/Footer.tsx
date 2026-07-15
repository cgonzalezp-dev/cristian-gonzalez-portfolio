import { Linkedin, Mail } from "lucide-react";
import { person } from "@/data/content";
import { Container } from "@/components/ui/Container";

export function Footer() {
  return (
    <footer className="border-t border-ink-900/[0.06] dark:border-white/[0.06] py-10">
      <Container className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <p className="text-sm text-ink-600 dark:text-paper-200/60">
          © {new Date().getFullYear() /* build-time constant, not runtime clock drift risk for a static page */}{" "}
          {person.name}. Built for a role, not a résumé.
        </p>
        <div className="flex items-center gap-4">
          <a
            href={person.linkedin}
            target="_blank"
            rel="noreferrer"
            aria-label="LinkedIn profile"
            className="text-ink-600 hover:text-brass-600 dark:text-paper-200/70 dark:hover:text-brass-400 transition-colors"
          >
            <Linkedin className="h-5 w-5" />
          </a>
          <a
            href={`mailto:${person.email}`}
            aria-label="Send an email"
            className="text-ink-600 hover:text-brass-600 dark:text-paper-200/70 dark:hover:text-brass-400 transition-colors"
          >
            <Mail className="h-5 w-5" />
          </a>
        </div>
      </Container>
    </footer>
  );
}
