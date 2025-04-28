"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import Image from "next/image";
import { motion } from "motion/react";
import { Carousel } from "@/components/ui/carousel";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useRegisterMutation } from '@/features/auth/authApiSlice';

// Placeholder data for the carousel
const placeholderSlides = [
  {
    title: "Generate Realistic Data",
    button: "Learn More",
    src: "/placeholder-img-1.jpg", // Replace with actual image path later
  },
  {
    title: "Test Your Models",
    button: "Get Started",
    src: "/placeholder-img-2.jpg", // Replace with actual image path later
  },
  {
    title: "Ensure Data Privacy",
    button: "Explore Features",
    src: "/placeholder-img-3.jpg", // Replace with actual image path later
  },
];

export default function RegistrationFormWithImages() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
      <Form />
      <div className="relative z-20 hidden w-full items-center justify-center overflow-hidden border-l border-neutral-100 bg-white md:flex dark:border-neutral-800 dark:bg-neutral-900">
        <div className="mx-auto flex h-full w-full items-center justify-center p-4">
          <Carousel slides={placeholderSlides} />
        </div>
      </div>
    </div>
  );
}

function Form() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [company, setCompany] = useState('');
  const router = useRouter();

  const [register, { isLoading, isError, error }] = useRegisterMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      console.log('Attempting registration with:', { name, email, company });
      const result = await register({ name, email, password, company }).unwrap();
      console.log('Registration successful:', result);
      router.push('/auth/login?registered=true');
    } catch (err) {
      console.error('Registration failed:', err);
    }
  };

  return (
    <form className="bg-gray-50 dark:bg-neutral-950" onSubmit={handleSubmit}>
      <div className="flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div>
            <div className="flex">
              <Logo />
            </div>
            <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-black dark:text-white">
              Sign up for an account
            </h2>
          </div>

          <div className="mt-10">
            <div>
              <div className="space-y-6">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                  >
                    Full name
                  </label>
                  <div className="mt-2">
                    <input
                      id="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="John Doe"
                      className="shadow-input block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:text-sm sm:leading-6 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                  >
                    Email address
                  </label>

                  <div className="mt-2">
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="hello@example.com"
                      className="shadow-input block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:text-sm sm:leading-6 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="company"
                    className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                  >
                    Company
                  </label>
                  <div className="mt-2">
                    <input
                      id="company"
                      type="text"
                      autoComplete="organization"
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Acme Inc."
                      className="shadow-input block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:text-sm sm:leading-6 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                  >
                    Password
                  </label>

                  <div className="mt-2">
                    <input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="•••••••• (min 8 chars)"
                      className="shadow-input block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:text-sm sm:leading-6 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                {isError && (
                  <div className="text-sm text-red-500 dark:text-red-400">
                    Error: {error?.data?.message || 'Registration failed. Please try again.'}
                  </div>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="relative inline-flex h-12 w-full overflow-hidden rounded-full p-[1px] focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 focus:ring-offset-slate-50 disabled:opacity-70"
                  >
                    <span className="absolute inset-[-1000%] animate-[spin_2s_linear_infinite] bg-[conic-gradient(from_90deg_at_50%_50%,#E2CBFF_0%,#393BB2_50%,#E2CBFF_100%)]" />
                    <span className="inline-flex h-full w-full cursor-pointer items-center justify-center rounded-full bg-slate-950 px-3 py-1 text-sm font-medium text-white backdrop-blur-3xl">
                      {isLoading ? 'Signing Up...' : 'Sign Up'}
                    </span>
                  </button>
                  <p
                    className={cn(
                      "mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400",
                    )}
                  >
                    Already have an account?{" "}
                    <Link href="/auth/login" className="text-black dark:text-white">
                      Sign in
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="relative">
                <div
                  className="absolute inset-0 flex items-center"
                  aria-hidden="true"
                >
                  <div className="w-full border-t border-neutral-300 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-gray-50 px-6 text-neutral-400 dark:bg-neutral-950 dark:text-neutral-500">
                    Or continue with
                  </span>
                </div>
              </div>

              <div className="mt-6 flex w-full items-center justify-center">
                <button
                  onClick={() => {}}
                  className="relative z-10 flex w-full items-center justify-center rounded-full bg-black px-4 py-1.5 text-sm font-medium text-white transition duration-200 hover:bg-black/90 md:text-sm dark:bg-white dark:text-black dark:hover:bg-neutral-100 dark:hover:shadow-xl"
                >
                  <IconBrandGithub className="h-5 w-5" />
                  <span className="text-sm font-semibold leading-6">
                    Github
                  </span>
                </button>
              </div>

              <p className="mt-8 text-center text-sm text-neutral-600 dark:text-neutral-400">
                By clicking on sign up, you agree to our{" "}
                <Link
                  href="#"
                  className="text-neutral-500 dark:text-neutral-300"
                >
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link
                  href="#"
                  className="text-neutral-500 dark:text-neutral-300"
                >
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
      legacyBehavior>
      <Image
        src="/synopticlogo3d.png"
        alt="logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">Synoptic</span>
    </Link>
  );
};
