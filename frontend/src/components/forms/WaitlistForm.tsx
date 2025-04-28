'use client';

import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/bmagic-button"; 
import { BackgroundGradient } from "@/components/ui/background-gradient";
// Assuming the styles are colocated or globally available. 
// If using CSS Modules specific to WaitlistSection, we need that file too.
// For now, let's assume styles are accessible or we'll adjust.
import styles from '../waitlist-section.module.css'; // Import styles from original component

export function WaitlistForm() {
  const [selectedVolume, setSelectedVolume] = useState<string>('');

  const handleVolumeClick = (volume: string) => {
    setSelectedVolume(volume);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    // TODO: Implement actual form submission logic (API call)
    console.log("Waitlist form submitted from modal", { 
      // Gather form data here (e.g., using FormData or state)
      selectedVolume 
    }); 
    alert('Thank you for joining the waitlist!'); // Simple confirmation
  };

  return (
     <BackgroundGradient 
        // Use appropriate class names, potentially reusing from WaitlistSection's module
        containerClassName={styles.formContainer} // Reusing style from original section
        className={styles.formContent} // Reusing style from original section
        animate={true}
      >
        <form onSubmit={handleSubmit} className="p-4"> {/* Add padding inside the form */}
          <h2 className="text-2xl font-bold mb-4 text-center text-white">Request a Demo</h2> {/* Added Title */}
          <p className="text-sm text-neutral-400 mb-6 text-center">Join our waitlist to get early access and updates.</p> {/* Added Description */}
          
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <Label htmlFor="modalFullName">Full Name</Label>
              <Input id="modalFullName" placeholder="Joey Zeng" type="text" required className={styles.formInput} />
            </div>
            <div className={styles.formField}>
              <Label htmlFor="modalWorkEmail">Work Email</Label>
              <Input id="modalWorkEmail" placeholder="hello@synoptic.dev" type="email" required className={styles.formInput} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <Label htmlFor="modalCompanyName">Company Name</Label>
              <Input id="modalCompanyName" placeholder="Synoptic Inc." type="text" required className={styles.formInput} />
            </div>
            <div className={styles.formField}>
              <Label htmlFor="modalIndustry">Industry</Label>
              <select
                id="modalIndustry"
                className={styles.select}
                required
                defaultValue=""
              >
                <option value="" disabled>Select Industry</option>
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
            <Label htmlFor="modalUsage">How will you use synthetic data?</Label>
            <textarea
              id="modalUsage"
              placeholder="Tell us about your use case..."
              className={styles.textarea}
              rows={4}
              required
            />
          </div>

          <div className={styles.submitButtonWrapper}>
            <Button
              type="submit"
              className={styles.submitButton}
            >
              Join Waitlist →
            </Button>
          </div>

          <p className={styles.disclaimer}>
            By joining the waitlist, you agree to receive updates about Synoptic.
          </p>
        </form>
      </BackgroundGradient>
  );
} 