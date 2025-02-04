'use client';

import { useState, useEffect, useRef } from 'react';
import { FiUsers, FiShield, FiCpu, FiClock } from 'react-icons/fi';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

interface Statistic {
  icon: any;
  value: number;
  target: number;
  label: string;
  prefix?: string;
  suffix?: string;
}

const statistics: Statistic[] = [
  {
    icon: FiUsers,
    value: 0,
    target: 1000000,
    label: 'Records Generated',
    suffix: '+'
  },
  {
    icon: FiShield,
    value: 0,
    target: 99.9,
    label: 'Privacy Score',
    suffix: '%'
  },
  {
    icon: FiCpu,
    value: 0,
    target: 50,
    label: 'Processing Speed',
    suffix: 'x'
  },
  {
    icon: FiClock,
    value: 0,
    target: 100,
    label: 'Time Saved',
    suffix: '%'
  }
];

// Sample data for charts
const generateTimeSeriesData = () => {
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  return months.map(month => ({
    month,
    synthetic: Math.floor(Math.random() * 1000) + 500,
    original: Math.floor(Math.random() * 800) + 200,
  }));
};

const generateDistributionData = () => {
  const data = [];
  for (let i = 0; i < 6; i++) {
    data.push({
      category: `Category ${i + 1}`,
      synthetic: Math.floor(Math.random() * 100),
      original: Math.floor(Math.random() * 100),
    });
  }
  return data;
};

const EnterpriseDemo = () => {
  const [stats, setStats] = useState<Statistic[]>(statistics);
  const [timeSeriesData] = useState(generateTimeSeriesData());
  const [distributionData] = useState(generateDistributionData());
  const [activeTab, setActiveTab] = useState<'timeSeries' | 'distribution'>('timeSeries');

  useEffect(() => {
    // Animate statistics
    const interval = setInterval(() => {
      setStats(currentStats =>
        currentStats.map(stat => ({
          ...stat,
          value: stat.value < stat.target
            ? Math.min(stat.value + (stat.target / 50), stat.target)
            : stat.target
        }))
      );
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-24">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Enterprise-Grade Performance
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Experience unmatched speed, privacy, and accuracy in synthetic data generation
          </p>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="bg-white dark:bg-dark-primary p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <stat.icon className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                  {stat.prefix}
                  {Math.round(stat.value)}
                  {stat.suffix}
                </div>
                <p className="text-gray-600 dark:text-gray-300">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Chart Section */}
        <div className="bg-white dark:bg-dark-primary rounded-xl shadow-lg p-8">
          {/* Chart Navigation */}
          <div className="flex gap-4 mb-8">
            <button
              onClick={() => setActiveTab('timeSeries')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'timeSeries'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Time Series Analysis
            </button>
            <button
              onClick={() => setActiveTab('distribution')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'distribution'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              Distribution Comparison
            </button>
          </div>

          {/* Charts */}
          <div className="h-[400px]">
            {activeTab === 'timeSeries' ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="month" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#F3F4F6'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="synthetic"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    name="Synthetic Data"
                  />
                  <Line
                    type="monotone"
                    dataKey="original"
                    stroke="#6366F1"
                    strokeWidth={2}
                    name="Original Data"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distributionData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="category" 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <YAxis 
                    stroke="#9CA3AF"
                    tick={{ fill: '#9CA3AF' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937',
                      border: 'none',
                      borderRadius: '0.5rem',
                      color: '#F3F4F6'
                    }}
                  />
                  <Bar dataKey="synthetic" fill="#3B82F6" name="Synthetic Data" />
                  <Bar dataKey="original" fill="#6366F1" name="Original Data" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default EnterpriseDemo; 