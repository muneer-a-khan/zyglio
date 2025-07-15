import { ModernHeroSection } from '@/components/modern-hero-section';
import { IndustryFeaturesSection } from '@/components/industry-features-section';
import { TestimonialsSection } from '@/components/testimonials-section';
import { CTASection } from '@/components/cta-section';
import { ModernFooter } from '@/components/modern-footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <ModernHeroSection />
      <IndustryFeaturesSection />
      <TestimonialsSection />
      <CTASection />
      <ModernFooter />
    </div>
  );
}
