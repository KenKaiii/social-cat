'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Workflows', href: '/dashboard/workflows' },
  { name: 'Credentials', href: '/dashboard/credentials' },
  { name: 'Activity', href: '/dashboard/activity' },
  { name: 'Settings', href: '/settings' },
  { name: 'Legacy', href: '/legacy/social-media' },
];

export function Navbar() {
  const pathname = usePathname();
  const [activeIndicator, setActiveIndicator] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!navRef.current) return;

    const activeLink = navRef.current.querySelector('[data-active="true"]') as HTMLElement;
    if (activeLink) {
      setActiveIndicator({
        left: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
      });
    }
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-40 bg-background-100 shadow-[inset_0_-1px] shadow-gray-alpha-400">
      <div className="flex h-[46px] items-center px-2 md:px-4 relative" ref={navRef}>
        {navigation.map((item) => {
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.name}
              href={item.href}
              data-active={isActive}
              className={`
                relative inline-block select-none px-3 py-4 no-underline transition-colors duration-200 text-14
                ${isActive ? 'text-gray-1000' : 'text-gray-700 hover:text-gray-900'}
              `}
              style={{ outlineOffset: '-6px', lineHeight: '0.875rem' }}
            >
              {item.name}
            </Link>
          );
        })}

        {/* Animated underline indicator */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-foreground transition-transform duration-150 origin-left"
          style={{
            transform: `translateX(${activeIndicator.left}px) scaleX(${activeIndicator.width > 0 ? activeIndicator.width / 100 : 0})`,
            width: '100px',
          }}
        />
      </div>
    </nav>
  );
}
