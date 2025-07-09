import { HeroSection } from '@/components/HeroSection';
import { TechnicianTraining } from '@/components/TechnicianTraining';
import { BuyerEducation } from '@/components/BuyerEducation';
import { Footer } from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <HeroSection />
      <TechnicianTraining />
      <BuyerEducation />
      <Footer />
    </div>
  );
}
