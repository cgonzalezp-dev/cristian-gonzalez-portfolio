import { Navbar } from "@/layout/Navbar";
import { Footer } from "@/layout/Footer";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { BackToTop } from "@/components/ui/BackToTop";
import { Hero } from "@/components/sections/Hero";
import { About } from "@/components/sections/About";
import { Philosophy } from "@/components/sections/Philosophy";
import { Experience } from "@/components/sections/Experience";
import { Results } from "@/components/sections/Results";
import { CaseStudy } from "@/components/sections/CaseStudy";
import { Skills } from "@/components/sections/Skills";
import { Learning } from "@/components/sections/Learning";
import { Personal } from "@/components/sections/Personal";
import { Testimonials } from "@/components/sections/Testimonials";
import { FinalCta } from "@/components/sections/FinalCta";

export default function App() {
  return (
    <>
      <ScrollProgress />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Experience />
        <Results />
        <CaseStudy />
        <Skills />
        <Philosophy />
        <Learning />
        <Personal />
        <Testimonials />
        <FinalCta />
      </main>
      <Footer />
      <BackToTop />
    </>
  );
}
