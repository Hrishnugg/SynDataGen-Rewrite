import React, { useState, useEffect } from 'react';
// import { Spotlight } from "./ui/spotlight-new"; // Removed Spotlight
import { Input } from "./ui/input"; // Corrected import path
import { Label } from "./ui/label"; // Corrected import path
import styles from './waitlist-section.module.css';
import { Button } from "./ui/bmagic-button"; // Corrected import path
import { TextGenerateEffect } from "./ui/text-generate-effect"; // Added TextGenerateEffect
import { BackgroundGradient } from "./ui/background-gradient"; // Import BackgroundGradient

const WaitlistSection: React.FC = () => {
  const [animationKey, setAnimationKey] = useState(0); // State for remounting effect
  const [selectedVolume, setSelectedVolume] = useState<string>(''); // State for selected volume

  useEffect(() => {
    // Set up interval to change the key every 10 seconds
    const intervalId = setInterval(() => {
      setAnimationKey(prevKey => prevKey + 1);
    }, 10000); // 10 seconds

    // Clear interval on component unmount
    return () => clearInterval(intervalId);
  }, []); // Run only once on mount

  // TODO: Implement form state (useState) and submission handler (handleSubmit)
  // const [selectedVolume, setSelectedVolume] = React.useState('');

  const handleVolumeClick = (volume: string) => {
    setSelectedVolume(volume); // Update selected volume state
    // console.log("Selected volume:", volume); // Placeholder
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Add form submission logic (e.g., API call)
    console.log("Form submitted"); // Placeholder
  };

  return (
    <section className={styles.waitlistSection}>
      <div className={styles.leftColumn}>
        {/* Replaced Spotlight and h2 with TextGenerateEffect */}
        <TextGenerateEffect 
          key={animationKey} // Add key to force remount
          words="Ready To Get Started?" 
          className={styles.heading} // Apply heading styles for size/weight
        />
      </div>
      <div className={styles.rightColumn}>
        {/* Wrap form with BackgroundGradient */}
        <BackgroundGradient 
          containerClassName={styles.formContainer} 
          className={styles.formContent}
          animate={true} // Use default animation
        >
          <form onSubmit={handleSubmit}>
            <div className={styles.formRow}>
              <div className={styles.formField}>
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="Hrishi Hari" type="text" required className={styles.formInput} />
              </div>
              <div className={styles.formField}>
                <Label htmlFor="workEmail">Work Email</Label>
                <Input id="workEmail" placeholder="noreply@synoptic.dev" type="email" required className={styles.formInput} />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.formField}>
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" placeholder="Synoptica Inc." type="text" required className={styles.formInput} />
              </div>
              <div className={styles.formField}>
                <Label htmlFor="industry">Industry</Label>
                <select
                  id="industry"
                  className={styles.select}
                  required
                  defaultValue=""
                >
                  <option value="" disabled>Select Industry</option>
                  {/* TODO: Populate with actual industry options */}
                  <option value="tech">Technology</option>
                  <option value="finance">Finance</option>
                  <option value="health">Healthcare</option>
                  <option value="retail">Retail</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="education">Education</option>
                  <option value="government">Government</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className={styles.formFieldFull}>
              <Label>Expected Data Volume</Label>
              <div className={styles.segmentedButtons}>
                {/* Apply active class based on selectedVolume state */}
                <button 
                  type="button" 
                  onClick={() => handleVolumeClick('<100K')} 
                  className={`${styles.segmentButton} ${selectedVolume === '<100K' ? styles.active : ''}`}
                >
                  &lt; 100K records
                </button>
                <button 
                  type="button" 
                  onClick={() => handleVolumeClick('100K-1M')} 
                  className={`${styles.segmentButton} ${selectedVolume === '100K-1M' ? styles.active : ''}`}
                >
                  100K - 1M records
                </button>
                <button 
                  type="button" 
                  onClick={() => handleVolumeClick('1M-10M')} 
                  className={`${styles.segmentButton} ${selectedVolume === '1M-10M' ? styles.active : ''}`}
                >
                  1M - 10M records
                </button>
                <button 
                  type="button" 
                  onClick={() => handleVolumeClick('10M+')} 
                  className={`${styles.segmentButton} ${selectedVolume === '10M+' ? styles.active : ''}`}
                >
                  10M+ records
                </button>
              </div>
            </div>

            <div className={styles.formFieldFull}>
              <Label htmlFor="usage">How will you use synthetic data?</Label>
              <textarea
                id="usage"
                placeholder="Type your message here"
                className={styles.textarea}
                rows={4}
                required
              />
            </div>

            {/* Wrap Button in a div for centering */}
            <div className={styles.submitButtonWrapper}>
              <Button
                type="submit"
                className={styles.submitButton}
              >
                Join Waitlist →
              </Button>
            </div>

            <p className={styles.disclaimer}>
              By joining the waitlist, you agree to receive updates about Synoptic. We respect your privacy and will never share your information.
            </p>
          </form>
        </BackgroundGradient>
      </div>
    </section>
  );
};

export default WaitlistSection; 