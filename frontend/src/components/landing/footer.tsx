import Image from "next/image";
import Link from "next/link";
import React from "react";
import { TextHoverEffect } from "../ui/text-hover-effect";

// Renamed component for clarity
export function Footer() {
  const pages = [
    { title: "Features", href: "#features" },
    { title: "Pricing", href: "#pricing" },
    { title: "About", href: "/about" },
    // { title: "Studio", href: "#" }, // Removed irrelevant links
    // { title: "Clients", href: "#" },
    // { title: "Blog", href: "#" },
    { title: "Contact", href: "/contact" },
  ];

  const socials = [
    { title: "LinkedIn", href: "#" }, // Example social links (replace #)
    { title: "Twitter", href: "#" },
    // { title: "Facebook", href: "#" },
    // { title: "Instagram", href: "#" },
  ];
  const legals = [
    { title: "Privacy Policy", href: "#" }, // Replace #
    { title: "Terms of Service", href: "#" }, // Replace #
    // { title: "Cookie Policy", href: "#" },
  ];

  const signups = [
    { title: "Sign Up", href: "/auth/signup" },
    { title: "Login", href: "/auth/login" },
    // { title: "Forgot Password", href: "#" },
  ];
  return (
    // Adjusted background and border for consistency
    <div className="border-t border-neutral-700 px-8 py-20 bg-black w-full relative overflow-hidden">
      <div className="max-w-7xl mx-auto text-sm text-neutral-400 flex sm:flex-row flex-col justify-between items-start md:px-8">
        <div>
          <div className="mr-0 md:mr-4 md:flex mb-4">
            <Logo />
          </div>
          <div className="mt-2 ml-2 text-neutral-500">
            {/* Updated copyright */}
            &copy; copyright Synoptic {new Date().getFullYear()}. All rights reserved.
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 items-start mt-10 sm:mt-0 md:mt-0">
          {/* Pages Grid */}
          <div className="flex justify-start space-y-4 flex-col w-full">
            <p className="text-white font-bold">Pages</p>
            <ul className="text-neutral-400 list-none space-y-4">
              {pages.map((page, idx) => (
                <li key={"pages" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-white"
                    href={page.href} // Use actual href
                  >
                    {page.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Socials Grid */}
          <div className="flex justify-start space-y-4 flex-col">
            <p className="text-white font-bold">Socials</p>
            <ul className="text-neutral-400 list-none space-y-4">
              {socials.map((social, idx) => (
                <li key={"social" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-white"
                    href={social.href} // Use actual href
                    target="_blank" // Open socials in new tab
                    rel="noopener noreferrer"
                  >
                    {social.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Grid */}
          <div className="flex justify-start space-y-4 flex-col">
            <p className="text-white font-bold">Legal</p>
            <ul className="text-neutral-400 list-none space-y-4">
              {legals.map((legal, idx) => (
                <li key={"legal" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-white"
                    href={legal.href} // Use actual href
                  >
                    {legal.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Register Grid */}
          <div className="flex justify-start space-y-4 flex-col">
            <p className="text-white font-bold">Account</p> {/* Renamed title */}
            <ul className="text-neutral-400 list-none space-y-4">
              {signups.map((auth, idx) => (
                <li key={"auth" + idx} className="list-none">
                  <Link
                    className="transition-colors hover:text-white"
                    href={auth.href} // Use actual href
                  >
                    {auth.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className="mt-20 text-center h-40 overflow-hidden"> 
        <div className="inline-block h-full"> 
         <TextHoverEffect text="Synoptic" duration={0.3} />
        </div>
      </div>
    </div>
  );
}

const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm mr-4 text-black px-2 py-1 relative z-20"
    >
      {/* Placeholder for Synoptic logo - replace src */}
      { <Image
        src="/synopticlogo3d.png" 
        alt="Synoptic Logo"
        width={30}
        height={30}
      /> }
      <span className="font-medium text-white">Synoptic</span> {/* Updated name */}
    </Link>
  );
}; 