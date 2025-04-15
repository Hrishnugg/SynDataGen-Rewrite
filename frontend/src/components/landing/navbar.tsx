"use client";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconMenu2, IconX } from "@tabler/icons-react";
import { motion, AnimatePresence } from "motion/react"; // Assuming motion/react based on project setup
import Image from "next/image";
import Link from "next/link";
import React, { useState } from "react";

// --- Exporting the main Navbar component as default ---
export default function Navbar() { // Removed navItems prop, will define defaults or make configurable later
  const navItems = [
    {
      name: "Services",
      link: "#",
      children: [
        { name: "Web Development", link: "#" },
        { name: "Interface Design", link: "#" },
        { name: "Search Engine Optimization", link: "#" },
        { name: "Branding", link: "#" },
      ],
    },
    {
      name: "Products",
      link: "#",
      children: [
        { name: "Algochurn", link: "#" },
        { name: "Tailwind Master Kit", link: "#" },
      ],
    },
    {
      name: "Pricing",
      link: "#",
      children: [
        { name: "Hobby", link: "#" },
        { name: "Individual", link: "#" },
        { name: "Team", link: "#" },
      ],
    },
  ];

  return (
    <div className="w-full">
      <DesktopNav navItems={navItems} />
      <MobileNav navItems={navItems} />
    </div>
  );
}

// --- Keeping internal components --- 

const DesktopNav = ({ navItems }: any) => {
  const [active, setActive] = useState<string | null>(null);
  return (
    <motion.div
      className={cn(
        "relative z-[60] mx-auto hidden w-full max-w-7xl flex-row items-center justify-between self-start rounded-full bg-white px-4 py-2 lg:flex dark:bg-neutral-950",
        "sticky inset-x-0 top-10", // Adjusted stickiness
      )}
    >
      <Logo />
      <div className="hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-zinc-600 transition duration-200 hover:text-zinc-800 lg:flex lg:space-x-2">
        <Menu setActive={setActive}>
          {/* Simplified Menu Items for now */}
          <MenuItem setActive={setActive} active={active} item="Features">
             <div className="flex flex-col space-y-4 text-sm">
               <HoveredLink href="#features">Core Features</HoveredLink>
               <HoveredLink href="#integrations">Integrations</HoveredLink>
             </div>
           </MenuItem>
           <MenuItem setActive={setActive} active={active} item="Pricing">
             <div className="flex flex-col space-y-4 text-sm">
               <HoveredLink href="#pricing">View Plans</HoveredLink>
             </div>
           </MenuItem>
           <MenuItem setActive={setActive} active={active} item="Docs">
             <div className="flex flex-col space-y-4 text-sm">
               <HoveredLink href="/docs">Documentation</HoveredLink>
             </div>
           </MenuItem>
        </Menu>
      </div>
      {/* TODO: Link Login/Signup buttons */}
      <Link href="/auth/login">
         <button className="hidden rounded-full bg-black px-8 py-2 text-sm font-bold text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset] md:block dark:bg-white dark:text-black">
           Login
         </button>
      </Link>
      {/* Add Sign Up button if needed */}
    </motion.div>
  );
};

const MobileNav = ({ navItems }: any) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.div
        animate={{ borderRadius: open ? "4px" : "2rem" }}
        key={String(open)}
        className="relative mx-auto flex w-full max-w-[calc(100vw-2rem)] flex-col items-center justify-between bg-white px-4 py-2 lg:hidden dark:bg-neutral-950"
      >
        <div className="flex w-full flex-row items-center justify-between">
          <Logo />
          {open ? (
            <IconX
              className="text-black dark:text-white"
              onClick={() => setOpen(!open)}
            />
          ) : (
            <IconMenu2
              className="text-black dark:text-white"
              onClick={() => setOpen(!open)}
            />
          )}
        </div>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-x-0 top-16 z-20 flex w-full flex-col items-start justify-start gap-4 rounded-lg bg-white px-4 py-8 dark:bg-neutral-950"
            >
              {/* Simplified Mobile Nav Items */}
              <Link href="#features" className="relative text-neutral-600 dark:text-neutral-300 w-full">
                 <motion.span className="block">Features</motion.span>
              </Link>
              <Link href="#pricing" className="relative text-neutral-600 dark:text-neutral-300 w-full">
                 <motion.span className="block">Pricing</motion.span>
              </Link>
              <Link href="/docs" className="relative text-neutral-600 dark:text-neutral-300 w-full">
                 <motion.span className="block">Docs</motion.span>
              </Link>
              <Link href="/auth/login" className="w-full">
                 <button className="w-full rounded-lg bg-black px-8 py-2 font-medium text-white shadow-[0px_-2px_0px_0px_rgba(255,255,255,0.4)_inset] dark:bg-white dark:text-black">
                   Login
                 </button>
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
};

// --- Helper Components (Keeping as defined in original code) ---

const Logo = () => {
  return (
    <Link
      href="/"
      className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1 text-sm font-normal text-black"
    >
      <Image
        src="/synopticlogo3d.png" // TODO: Confirm logo path
        alt="Synoptic Logo"
        width={30}
        height={30}
      />
      <span className="font-medium text-black dark:text-white">Synoptic</span>
    </Link>
  );
};

const transition = {
  type: "spring",
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

const MenuItem = ({ // Changed export to const
  setActive,
  active,
  item,
  children,
}: {
  setActive: (item: string) => void;
  active: string | null;
  item: string;
  children?: React.ReactNode;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative">
      <motion.p
        transition={{ duration: 0.3 }}
        className="cursor-pointer text-neutral-700 hover:opacity-[0.9] dark:text-neutral-300"
      >
        {item}
      </motion.p>
      {active !== null && (
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={transition}
        >
          {active === item && (
            <div className="absolute left-1/2 top-[calc(100%_+_0.2rem)] -translate-x-1/2 transform pt-4">
              <div className="">
                <motion.div
                  transition={transition}
                  layoutId="active" // layoutId ensures smooth animation
                  className="mt-4 overflow-hidden rounded-2xl bg-white shadow-xl backdrop-blur-sm dark:bg-neutral-950"
                >
                  <motion.div
                    layout // layout ensures smooth animation
                    className="h-full w-max p-4"
                  >
                    {children}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

const Menu = ({ // Changed export to const
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)} // resets the state
      className="relative flex justify-center space-x-4 rounded-full bg-white px-4 py-3 dark:bg-neutral-950"
    >
      {children}
    </nav>
  );
};

const ProductItem = ({ // Changed export to const
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <Link href={href} className="flex gap-4">
      <Image
        src={src}
        width={140}
        height={70}
        alt={title}
        className="flex-shrink-0 rounded-md shadow-2xl"
      />
      <div>
        <h4 className="mb-1 text-base font-normal text-black dark:text-white">
          {title}
        </h4>
        <p className="max-w-[10rem] text-sm text-neutral-700 dark:text-neutral-300">
          {description}
        </p>
      </div>
    </Link>
  );
};

const HoveredLink = ({ children, ...rest }: any) => { // Changed export to const
  return (
    <Link
      {...rest}
      className="text-neutral-700 hover:text-black dark:text-neutral-200"
    >
      {children}
    </Link>
  );
};

// Removed NavbarWithChildren wrapper as it's not needed for the page itself
// Removed MobileChildNavItems as it was specific to the complex navItems structure