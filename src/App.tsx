import { Navbar } from "@/layout/Navbar";
import { Footer } from "@/layout/Footer";
import { ScrollProgress } from "@/components/ui/ScrollProgress";
import { BackToTop } from "@/components/ui/BackToTop";
import { useHashRoute } from "@/hooks/useHashRoute";
import { Profile } from "@/pages/Profile";
import { BusinessCase } from "@/pages/BusinessCase";

export default function App() {
  const { route, navigate } = useHashRoute();

  return (
    <>
      <ScrollProgress />
      <Navbar route={route} onNavigate={navigate} />
      {route === "strategy" ? <BusinessCase /> : <Profile />}
      <Footer />
      <BackToTop />
    </>
  );
}
