"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

export default function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={cn(
        "fixed top-0 left-0 right-0 z-50 w-full transition-all duration-500 ease-out",
        "bg-white border-b border-white/10"
      )}
    >
      <div className="container mx-auto px-2 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-center">
          {/* Logo Section */}
          <Link 
            href="/" 
            className="flex items-center group transition-all duration-300 ease-out hover:-translate-y-0.5 hover:opacity-100 focus:opacity-100"
            style={{ opacity: 1, visibility: 'visible' }}
          >
            <div className="relative h-12 w-[400px] sm:w-[460px] overflow-hidden rounded-xl">
              <div className="absolute inset-0 bg-white/20 backdrop-blur-sm rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <Image 
                src="/logo.png" 
                alt="dynamIT - A.V.S. Engineering College" 
                fill 
                sizes="100vw"
                className="object-contain transition-transform duration-300 group-hover:scale-105" 
                priority 
              />
            </div>
          </Link>

         
        </div>
      </div>

      {/* Subtle gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
    </header>
  );
}
