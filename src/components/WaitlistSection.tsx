import WaitlistForm from './WaitlistForm';

export default function WaitlistSection() {
  return (
    <section id="waitlist" className="relative py-24 bg-gray-50 dark:bg-[#0D1425] overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Join the Waitlist
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Be among the first to experience the future of synthetic data generation.
          </p>
        </div>
        <WaitlistForm />
      </div>
    </section>
  );
} 