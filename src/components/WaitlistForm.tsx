"use client";

import { useState } from "react";
import { FiArrowRight } from "react-icons/fi";
import { motion } from "framer-motion";

interface FormData {
  name: string;
  email: string;
  company: string;
  industry: string;
  customIndustry: string;
  dataVolume: string;
  useCase: string;
}

export default function WaitlistForm() {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    industry: "",
    customIndustry: "",
    dataVolume: "",
    useCase: "",
  });

  const [showCustomIndustry, setShowCustomIndustry] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const industries = [
    "Technology",
    "Healthcare",
    "Financial Services",
    "Insurance",
    "Retail",
    "Manufacturing",
    "Education",
    "Government",
    "Telecommunications",
    "Energy",
    "Transportation",
    "Media & Entertainment",
    "Real Estate",
    "Non-Profit",
    "Other",
  ];

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;

    if (name === "industry") {
      setShowCustomIndustry(value === "Other");
      if (value !== "Other") {
        setFormData((prev) => ({
          ...prev,
          industry: value,
          customIndustry: "",
        }));
      } else {
        setFormData((prev) => ({
          ...prev,
          industry: value,
        }));
      }
    } else if (name === "customIndustry") {
      setFormData((prev) => ({
        ...prev,
        customIndustry: value,
        industry: value ? "Other" : "",
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const submissionData = {
        ...formData,
        industry:
          formData.industry === "Other"
            ? formData.customIndustry
            : formData.industry,
      };

      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submissionData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      setSuccess(true);
      setFormData({
        name: "",
        email: "",
        company: "",
        industry: "",
        customIndustry: "",
        dataVolume: "",
        useCase: "",
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto bg-white dark:bg-[#1F2937] rounded-3xl shadow-lg p-12">
      {success ? (
        <div className="text-center">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Thank you for joining our waitlist!
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            We'll keep you updated on our progress and let you know when we're
            ready to launch.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label
                htmlFor="name"
                className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
                required
              />
            </div>
            <div>
              <label
                htmlFor="email"
                className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Work Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <label
                htmlFor="company"
                className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Company Name
              </label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
                required
              />
            </div>
            <div className="relative">
              <label
                htmlFor="industry"
                className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3"
              >
                Industry
              </label>
              <div className="relative">
                <select
                  id="industry"
                  name="industry"
                  value={formData.industry}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white appearance-none pr-10"
                  required
                >
                  <option value="" disabled>
                    Select Industry
                  </option>
                  {industries.map((industry) => (
                    <option
                      key={industry}
                      value={industry}
                      className="bg-gray-50 dark:bg-[#0A0F1C]"
                    >
                      {industry}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              {showCustomIndustry && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mt-3"
                >
                  <input
                    type="text"
                    id="customIndustry"
                    name="customIndustry"
                    value={formData.customIndustry}
                    onChange={handleChange}
                    placeholder="Enter your industry"
                    className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white"
                    required={formData.industry === "Other"}
                  />
                </motion.div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3">
              Expected Data Volume
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <motion.button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    dataVolume: "< 100K records",
                  }))
                }
                className={`px-4 py-3 rounded-lg border ${
                  formData.dataVolume === "< 100K records"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500"
                } transition-colors text-sm font-medium`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {"< 100K records"}
              </motion.button>
              <motion.button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    dataVolume: "100K - 1M records",
                  }))
                }
                className={`px-4 py-3 rounded-lg border ${
                  formData.dataVolume === "100K - 1M records"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500"
                } transition-colors text-sm font-medium`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                100K - 1M records
              </motion.button>
              <motion.button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    dataVolume: "1M - 10M records",
                  }))
                }
                className={`px-4 py-3 rounded-lg border ${
                  formData.dataVolume === "1M - 10M records"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500"
                } transition-colors text-sm font-medium`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                1M - 10M records
              </motion.button>
              <motion.button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    dataVolume: "10M+ records",
                  }))
                }
                className={`px-4 py-3 rounded-lg border ${
                  formData.dataVolume === "10M+ records"
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500"
                } transition-colors text-sm font-medium`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                10M+ records
              </motion.button>
            </div>
          </div>

          <div>
            <label
              htmlFor="useCase"
              className="block text-base font-medium text-gray-700 dark:text-gray-300 mb-3"
            >
              How will you use synthetic data?
            </label>
            <textarea
              id="useCase"
              name="useCase"
              value={formData.useCase}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-[#0A0F1C] border border-gray-200 dark:border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-900 outline-none transition-colors text-gray-900 dark:text-white resize-none"
              required
            />
          </div>

          <div className="flex flex-col items-center pt-4">
            <motion.button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center gap-2 bg-[rgb(86,102,251)] text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
              whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
            >
              {isSubmitting ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  Join Waitlist
                  <FiArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
            <p className="mt-4 text-sm text-gray-400 text-center">
              By joining the waitlist, you agree to receive updates about
              Synoptic. We respect your privacy and will never share your
              information.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
