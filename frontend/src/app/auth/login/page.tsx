"use client";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { IconBrandGithub } from "@tabler/icons-react";
import Image from "next/image";
import { motion } from "motion/react";
import { Carousel } from "@/components/ui/carousel";
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLoginMutation } from '@/features/auth/authApiSlice';
import { StarsBackground } from '@/components/animate-ui/backgrounds/stars';
import { Ripple } from "@/components/magicui/ripple";

// Placeholder data for the carousel
const placeholderSlides = [
  {
    title: "Generate Realistic Data",
    button: "Learn More",
    src: "/carousel2.png", // Replace with actual image path later
  },
  {
    title: "Test Your Models",
    button: "Get Started",
    src: "/synoptic-dashboard.png", // Replace with actual image path later
  },
  {
    title: "Ensure Data Privacy",
    button: "Explore Features",
    src: "/synoptic-dashboard.png", // Replace with actual image path later
  },
];

export default function SignInPage() {
  return (
    <div className="grid min-h-screen w-full grid-cols-1 md:grid-cols-2">
      <StarsBackground className="relative z-10">
        <LoginForm />
      </StarsBackground>
      <div className="relative z-20 hidden w-full items-center justify-center overflow-hidden border-l border-neutral-100 bg-neutral-900 md:flex dark:border-neutral-800">
        <Ripple />
        <span className="z-10 text-4xl font-bold text-white">
          Synoptic
        </span>
      </div>
    </div>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const [login, { isLoading, isError, error }] = useLoginMutation();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      console.log('Attempting login with:', { email }); // Basic log
      const result = await login({ email, password }).unwrap();
      console.log('Login successful:', result); // Log success
      // TODO: Dispatch action to set user state in authSlice if needed
      router.push('/dashboard'); // Redirect to dashboard on success
    } catch (err) {
      console.error('Login failed:', err);
      // Error details are in the `error` object from the hook
      // Displaying the error message below the form
    }
  };

  return (
    <form className="h-full" onSubmit={handleSubmit}>
      <div className="relative z-20 flex h-full w-full items-center justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md">
          <div>
            <div className="flex">
              <Logo />
            </div>
            <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-black dark:text-white">
              Sign in to your account
            </h2>
          </div>

          <div className="mt-10">
            <div>
              <div className="space-y-6">
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
                    htmlFor="password"
                    className="block text-sm font-medium leading-6 text-neutral-700 dark:text-neutral-400"
                  >
                    Password
                  </label>

                  <div className="mt-2">
                    <input
                      id="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="shadow-input block w-full rounded-md border-0 bg-white px-4 py-1.5 text-black placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-neutral-400 sm:text-sm sm:leading-6 dark:bg-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                {isError && (
                  <div className="text-sm text-red-500 dark:text-red-400">
                    {(error && 'status' in error && 'data' in error && typeof error.data === 'object' && error.data && 'message' in error.data) 
                      ? (error.data as any).message 
                      : 'Login failed. Please check your credentials.'}
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
                      {isLoading ? 'Signing In...' : 'Sign In'}
                    </span>
                  </button>
                  <p
                    className={cn(
                      "mt-4 text-center text-sm text-neutral-600 dark:text-neutral-400",
                    )}
                  >
                    Don't have an account?{" "}
                    <Link href="/auth/signup" className="text-black dark:text-white">
                      Sign up
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
    >
      <>
        <Image
          src="/synopticlogo3d.png"
          alt="logo"
          width={30}
          height={30}
        />
        <span className="font-medium text-black dark:text-white">Synoptic</span>
      </>
    </Link>
  );
};
