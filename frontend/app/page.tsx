import { LandingNavbar } from "@/components/forecastiq/landing-navbar";
import { LandingHero } from "@/components/forecastiq/landing-hero";
import { LandingFeatures } from "@/components/forecastiq/landing-features";
import { LandingHowItWorks } from "@/components/forecastiq/landing-how-it-works";
import { LandingTechStack } from "@/components/forecastiq/landing-tech-stack";
import { LandingFooter } from "@/components/forecastiq/landing-footer";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-background">
      <LandingNavbar />
      <LandingHero />
      <LandingFeatures />
      <LandingHowItWorks />
      <LandingTechStack />
      <LandingFooter />
    </main>
  );
}
