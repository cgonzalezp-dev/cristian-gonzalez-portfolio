import { Navbar } from "@/layout/Navbar";
import { Footer } from "@/layout/Footer";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { BackToTop } from "@/components/ui/BackToTop";
import { useHashRoute } from "@/hooks/useHashRoute";
import { Profile } from "@/pages/Profile";
import { BusinessCase } from "@/pages/BusinessCase";
import { Games } from "@/pages/Games";

export default function App() {
  const { route, navigate } = useHashRoute();

  const page =
    route === "strategy" ? <BusinessCase /> : route === "games" ? <Games /> : <Profile />;

  return (
    <>
      <ScrollProgress />
      <Navbar route={route} onNavigate={navigate} />
      {page}
      <Footer />
      <BackToTop />
    </>
  );
}
