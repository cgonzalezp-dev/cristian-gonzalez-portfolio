import { Hero } from "@/components/sections/Hero";
import { Philosophy } from "@/components/sections/Philosophy";
import { Experience } from "@/components/sections/Experience";
import { Results } from "@/components/sections/Results";
import { CaseStudy } from "@/components/sections/CaseStudy";
import { Solutions } from "@/components/sections/Solutions";
import { Skills } from "@/components/sections/Skills";
import { Learning } from "@/components/sections/Learning";
import { Personal } from "@/components/sections/Personal";
import { Testimonials } from "@/components/sections/Testimonials";
import { FinalCta } from "@/components/sections/FinalCta";

export function Profile() {
  return (
    <main>
      <Hero />
      <Experience />
      <Results />
      <CaseStudy />
      <Solutions />
      <Skills />
      <Philosophy />
      <Learning />
      <Personal />
      <Testimonials />
      <FinalCta />
    </main>
  );
}
