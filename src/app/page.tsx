import HeroSection from '../components/HeroSection';
import FeaturesSection from '../components/FeaturesSection';
import WaitlistForm from '../components/WaitlistForm';
import ChatDemo from '../components/ChatDemo';
import EnterpriseDemo from '../components/EnterpriseDemo';
import SectionTransition from '../components/SectionTransition';
import DecagonModel from '../components/DecagonModel';

export default function Home() {
  return (
    <main className="min-h-screen pt-20">
      <SectionTransition>
        <HeroSection />
      </SectionTransition>

      {/* Demo section removed for now
      <SectionTransition delay={0.2}>
        <section className="py-24 bg-gray-50 dark:bg-dark-secondary">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
                See it in Action
              </h2>
              <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Try our interactive demo to see how our synthetic data generation platform works.
              </p>
            </div>
            <ChatDemo />
          </div>
        </section>
      </SectionTransition> */}

      <SectionTransition delay={0.3}>
        <div className="bg-white dark:bg-dark-primary">
          <FeaturesSection />
        </div>
      </SectionTransition>

      {/* Enterprise demo section removed for now
      <SectionTransition delay={0.4}>
        <div className="bg-gray-50 dark:bg-dark-secondary">
          <EnterpriseDemo />
        </div>
      </SectionTransition> */}

      <SectionTransition delay={0.5}>
        <div className="bg-white dark:bg-dark-primary py-12">
          <WaitlistForm />
        </div>
      </SectionTransition>

      <div className="container mx-auto px-4">
        <div className="py-12">
          <DecagonModel />
        </div>
      </div>
    </main>
  );
} 