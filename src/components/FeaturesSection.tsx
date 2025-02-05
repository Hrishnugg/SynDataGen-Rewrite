'use client';

import { FiShield, FiDatabase, FiTrendingUp, FiCpu, FiLock, FiZap } from 'react-icons/fi';
import Card from './ui/Card';
import { motion } from 'framer-motion';

const features = [
  {
    icon: FiDatabase,
    title: 'High-Quality Synthetic Data',
    description: 'Generate synthetic data that preserves statistical properties and relationships of your original dataset.',
    color: 'from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500',
    glowColor: 'rgba(59, 130, 246, 0.5)',
  },
  {
    icon: FiShield,
    title: 'Privacy by Design',
    description: 'Built-in privacy guarantees ensure your synthetic data is fully anonymized and compliant with regulations.',
    color: 'from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500',
    glowColor: 'rgba(99, 102, 241, 0.5)',
  },
  {
    icon: FiTrendingUp,
    title: 'Statistical Accuracy',
    description: 'Advanced algorithms maintain correlations and patterns while ensuring data utility.',
    color: 'from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500',
    glowColor: 'rgba(168, 85, 247, 0.5)',
  },
  {
    icon: FiCpu,
    title: 'Enterprise Scale',
    description: 'Handle millions of records with high performance distributed processing capabilities.',
    color: 'from-pink-500 to-pink-600 dark:from-pink-400 dark:to-pink-500',
    glowColor: 'rgba(236, 72, 153, 0.5)',
  },
  {
    icon: FiLock,
    title: 'Secure Infrastructure',
    description: 'End-to-end encryption and secure deployment options for sensitive data environments.',
    color: 'from-red-500 to-red-600 dark:from-red-400 dark:to-red-500',
    glowColor: 'rgba(239, 68, 68, 0.5)',
  },
  {
    icon: FiZap,
    title: 'Fast Integration',
    description: 'Quick setup with your existing data infrastructure through our flexible APIs and connectors.',
    color: 'from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500',
    glowColor: 'rgba(249, 115, 22, 0.5)',
  },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function FeaturesSection() {
  return (
    <section className="py-24 px-6" id="features">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-gray-900 to-gray-700 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            Complete Solution for the AI Era
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Generate high-quality synthetic data while maintaining privacy, security, and statistical accuracy. Powered by our novel ML model combining Gemini and DeepSeek architecture, backed by Carnegie Mellon professors.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div key={feature.title} variants={item}>
              <Card gradient className="p-8 h-full" glowColor={feature.glowColor}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} p-4 mb-6 shadow-lg`}>
                  <feature.icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {feature.description}
                </p>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
} 