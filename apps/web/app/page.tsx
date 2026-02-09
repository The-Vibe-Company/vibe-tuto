import { Navbar } from "@/components/landing/Navbar";
import { HeroSection } from "@/components/landing/HeroSection";
import { LogoCloud } from "@/components/landing/LogoCloud";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { SolutionSection } from "@/components/landing/SolutionSection";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { PricingCard } from "@/components/landing/PricingCard";
import { FAQAccordion } from "@/components/landing/FAQAccordion";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="min-h-screen bg-stone-50">
      <Navbar />
      <HeroSection />
      <LogoCloud />
      <ProblemSection />
      <SolutionSection />
      <HowItWorks />
      <FeatureBento />
      <PricingCard />
      <FAQAccordion />
      <FinalCTA />
      <Footer />
    </div>
  );
}
