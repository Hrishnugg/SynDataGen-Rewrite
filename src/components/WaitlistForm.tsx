'use client';

import { useState } from 'react';
import { FiArrowRight, FiCheck, FiLoader } from 'react-icons/fi';

type FormStatus = 'idle' | 'loading' | 'success' | 'error';
type DataSize = 'small' | 'medium' | 'large' | 'enterprise';

interface FormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  otherIndustry?: string;
  dataSize: DataSize;
  useCase: string;
}

const industries = [
  'Financial Services',
  'Healthcare',
  'Technology',
  'Retail',
  'Manufacturing',
  'Government',
  'Education',
  'Other'
];

const dataSizes: { value: DataSize; label: string }[] = [
  { value: 'small', label: '< 100K records' },
  { value: 'medium', label: '100K - 1M records' },
  { value: 'large', label: '1M - 10M records' },
  { value: 'enterprise', label: '10M+ records' }
];

export default function WaitlistForm() {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    company: '',
    industry: '',
    otherIndustry: '',
    dataSize: 'medium',
    useCase: '',
  });
  const [showOtherIndustryDialog, setShowOtherIndustryDialog] = useState(false);
  const [formStatus, setFormStatus] = useState<FormStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.industry === 'Other' && !formData.otherIndustry) {
      setErrorMessage('Please specify your industry');
      return;
    }
    
    setFormStatus('loading');
    setErrorMessage('');

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setFormStatus('success');

    // Reset form after success
    setFormData({
      name: '',
      email: '',
      company: '',
      industry: '',
      otherIndustry: '',
      dataSize: 'medium',
      useCase: '',
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'industry' && value === 'Other') {
      setShowOtherIndustryDialog(true);
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <section className="py-24" id="waitlist">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Join the Waitlist
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Be among the first to experience the future of synthetic data generation.
          </p>
        </div>

        <div className="bg-white dark:bg-dark-secondary rounded-2xl shadow-lg p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Work Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company Name
                </label>
                <input
                  type="text"
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors"
                  required
                />
              </div>
              <div>
                <label htmlFor="industry" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Industry
                </label>
                <div className="relative">
                  <select
                    id="industry"
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full px-4 pr-10 py-3 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors appearance-none"
                    required
                  >
                    <option value="">Select Industry</option>
                    {industries.map(industry => (
                      <option key={industry} value={industry}>{industry}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 dark:text-gray-400">
                    <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                      <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Expected Data Volume
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {dataSizes.map(size => (
                  <label
                    key={size.value}
                    className={`
                      flex items-center justify-center p-4 border rounded-lg cursor-pointer transition-all
                      ${formData.dataSize === size.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-800'
                      }
                      dark:text-gray-300
                    `}
                  >
                    <input
                      type="radio"
                      name="dataSize"
                      value={size.value}
                      checked={formData.dataSize === size.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <span className="text-sm font-medium">{size.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                How will you use synthetic data?
              </label>
              <textarea
                id="useCase"
                name="useCase"
                value={formData.useCase}
                onChange={handleChange}
                rows={4}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors resize-none"
                required
              />
            </div>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={formStatus === 'loading' || formStatus === 'success'}
                className={`
                  flex items-center justify-center gap-2 px-8 py-4 rounded-lg text-white font-semibold transition-all duration-200
                  ${formStatus === 'success'
                    ? 'bg-green-500 hover:bg-green-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                  }
                  ${formStatus === 'loading' ? 'cursor-not-allowed opacity-80' : ''}
                  min-w-[200px]
                `}
              >
                {formStatus === 'loading' && (
                  <FiLoader className="w-5 h-5 animate-spin" />
                )}
                {formStatus === 'success' && (
                  <FiCheck className="w-5 h-5" />
                )}
                {formStatus === 'idle' && (
                  <FiArrowRight className="w-5 h-5" />
                )}
                {formStatus === 'success' ? 'Submitted!' : formStatus === 'loading' ? 'Submitting...' : 'Join Waitlist'}
              </button>
            </div>

            {errorMessage && (
              <p className="text-red-500 dark:text-red-400 text-center mt-4">
                {errorMessage}
              </p>
            )}

            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-6">
              By joining the waitlist, you agree to receive updates about nGrams.ai.
              We respect your privacy and will never share your information.
            </p>
          </form>
        </div>

        {showOtherIndustryDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-secondary rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Please Specify Your Industry
              </h3>
              <input
                type="text"
                name="otherIndustry"
                value={formData.otherIndustry}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-dark-primary border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-200 dark:focus:ring-blue-900 outline-none transition-colors mb-4"
                placeholder="Enter your industry"
                autoFocus
              />
              <div className="flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({ ...prev, industry: '' }));
                    setShowOtherIndustryDialog(false);
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.otherIndustry) {
                      setErrorMessage('Please specify your industry');
                      return;
                    }
                    setShowOtherIndustryDialog(false);
                    setErrorMessage('');
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
} 