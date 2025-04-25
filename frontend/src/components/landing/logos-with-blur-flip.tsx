"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";

export function LogosWithBlurFlip() {
  const [logos, setLogos] = useState([
    [
      {
        name: "Carnegie Mellon University",
        src: "/cmu-wordmark-horizontal-r.png",
      },
      {
        name: "Google Gemini",
        src: "/Google_Gemini_logo.svg",
      },
      {
        name: "DeepSeek",
        src: "/DeepSeek_logo.svg",
      },
      {
        name: "NVIDIA",
        src: "/Nvidia_logo.svg",
      },
    ],
    [
      {
        name: "Carnegie Mellon University",
        src: "/cmu-wordmark-horizontal-r.png",
      },
      {
        name: "Google Cloud",
        src: "/Google_Cloud_logo.svg",
      },
      {
        name: "Amazon AWS",
        src: "/Amazon_Web_Services-Logo.png",
      },
      {
        name: "NVIDIA",
        src: "/Nvidia_logo.svg",
      },
    ],
  ]);
  const [activeLogoSet, setActiveLogoSet] = useState(logos[0]);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const flipLogos = () => {
    setLogos((currentLogos) => {
      const newLogos = [...currentLogos.slice(1), currentLogos[0]];
      setActiveLogoSet(newLogos[0]);
      setIsAnimating(true);
      return newLogos;
    });
  };

  useEffect(() => {
    if (!isAnimating) {
      const timer = setTimeout(() => {
        flipLogos();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isAnimating]);

  return (
    <div className="relative z-20 px-4 py-10 md:px-8 md:py-40">
      <h2 className="bg-gradient-to-b from-neutral-900 to-neutral-600 bg-clip-text text-center font-sans text-2xl font-bold text-transparent md:text-5xl dark:from-white dark:to-neutral-600">
        With help from the best companies
      </h2>
      <p className="mt-4 text-center font-sans text-base text-neutral-700 dark:text-neutral-300">
        Companies that have been supporting us from the very start.
      </p>
      <div className="relative mt-20 flex h-full w-full flex-wrap justify-center gap-10 md:gap-10">
        <AnimatePresence
          mode="popLayout"
          onExitComplete={() => {
            setIsAnimating(false);
          }}
        >
          {activeLogoSet.map((logo, idx) => (
            <motion.div
              initial={{ y: 40, opacity: 0, filter: "blur(10px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              exit={{ y: -40, opacity: 0, filter: "blur(10px)" }}
              transition={{
                duration: 0.8,
                delay: 0.1 * idx,
                ease: [0.4, 0, 0.2, 1],
              }}
              key={logo.name + idx + "logo-flip"}
              className="relative"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width="100"
                height="100"
                className="h-10 w-20 object-contain filter md:h-20 md:w-40"
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
} 