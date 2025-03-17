"use client";

import {
  FiShield,
  FiDatabase,
  FiTrendingUp,
  FiCpu,
  FiLock,
  FiZap,
} from "react-icons/fi";
import { Card } from "@/components/ui/ui-card";
import { motion } from "framer-motion";

const features = [
  {
    icon: FiDatabase,
    title: "High-Quality Synthetic Data",
    description:
      "Generate synthetic data using our advanced transformer-based architecture with multi-head attention mechanisms and custom embedding layers, preserving complex relationships and statistical properties.",
    color: "from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500",
    glowColor: "rgba(59, 130, 246, 0.5)",
    hoverColor: "rgba(59, 130, 246, 0.3)",
    iconBgClass: "bg-blue-500 dark:bg-blue-500",
    iconBgClassLight: "bg-blue-500/90",
  },
  {
    icon: FiShield,
    title: "Privacy by Design",
    description:
      "Built-in (ε, δ)-differential privacy guarantees with configurable privacy budgets. Our architecture ensures mathematical privacy bounds while maintaining data utility through advanced composition theorems.",
    color:
      "from-indigo-500 to-indigo-600 dark:from-indigo-400 dark:to-indigo-500",
    glowColor: "rgba(99, 102, 241, 0.5)",
    hoverColor: "rgba(99, 102, 241, 0.3)",
    iconBgClass: "bg-indigo-500 dark:bg-indigo-500",
    iconBgClassLight: "bg-indigo-500/90",
  },
  {
    icon: FiTrendingUp,
    title: "Statistical Accuracy",
    description:
      "Preserve high-dimensional correlations using copula-based modeling and advanced GANs. Our validation pipeline ensures KS-test p-values > 0.95 for marginal distributions.",
    color:
      "from-purple-500 to-purple-600 dark:from-purple-400 dark:to-purple-500",
    glowColor: "rgba(168, 85, 247, 0.7)",
    hoverColor: "rgba(168, 85, 247, 0.3)",
    iconBgClass: "bg-purple-500 dark:bg-purple-500",
    iconBgClassLight: "bg-purple-500/90",
  },
  {
    icon: FiCpu,
    title: "Enterprise Scale",
    description:
      "Distributed processing with CUDA-accelerated PyTorch backend. Handle millions of records through optimized batch processing and parallel generation pipelines.",
    color: "from-pink-500 to-pink-600 dark:from-pink-400 dark:to-pink-500",
    glowColor: "rgba(236, 72, 153, 0.5)",
    hoverColor: "rgba(236, 72, 153, 0.3)",
    iconBgClass: "bg-pink-500 dark:bg-pink-500",
    iconBgClassLight: "bg-pink-500/90",
  },
  {
    icon: FiLock,
    title: "Secure Infrastructure",
    description:
      "End-to-end encryption with AES-256, secure key rotation, and isolated compute environments.",
    color: "from-red-500 to-red-600 dark:from-red-400 dark:to-red-500",
    glowColor: "rgba(239, 68, 68, 0.5)",
    hoverColor: "rgba(239, 68, 68, 0.3)",
    iconBgClass: "bg-red-500 dark:bg-red-500",
    iconBgClassLight: "bg-red-500/90",
  },
  {
    icon: FiZap,
    title: "Fast Integration",
    description:
      "RESTful APIs with OpenAPI specification, native SDKs for Python/JavaScript, and direct connectors for major data warehouses including Snowflake and BigQuery.",
    color:
      "from-orange-500 to-orange-600 dark:from-orange-400 dark:to-orange-500",
    glowColor: "rgba(249, 115, 22, 0.5)",
    hoverColor: "rgba(249, 115, 22, 0.3)",
    iconBgClass: "bg-orange-500 dark:bg-orange-500",
    iconBgClassLight: "bg-orange-500/90",
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
    <section className="py-16 px-6 bg-white dark:bg-gray-950" id="features">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900 dark:text-white">
            Complete Solution for the AI Era
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Our advanced ML architecture combines transformer-based models with
            differential privacy mechanisms to generate high-fidelity synthetic
            data. Built on PyTorch with custom attention layers and
            privacy-preserving optimizers.
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
            <motion.div key={feature.title} variants={item} className="h-full">
              <Card
                hoverEffect
                className="p-8 h-full group bg-gray-50 dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700"
                glowColor={feature.glowColor}
                colorHover={feature.hoverColor}
              >
                <div
                  className={`w-14 h-14 rounded-full ${feature.iconBgClassLight} dark:${feature.iconBgClass} p-3.5 mb-6 shadow-lg`}
                >
                  <feature.icon className="w-full h-full text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
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
