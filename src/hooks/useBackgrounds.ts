import { useState } from 'react';

export type Background = {
  id: string;
  name: string;
  className: string;
  description: string;
};

const backgrounds: Background[] = [
  {
    id: 'default',
    name: 'Default',
    className: 'bg-gray-50 dark:bg-black',
    description: 'Clean and minimal'
  },
  {
    id: 'blockchain',
    name: 'Blockchain',
    className: 'bg-[linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.1)_75%,rgba(0,0,0,0.1)),linear-gradient(45deg,rgba(0,0,0,0.1)_25%,transparent_25%,transparent_75%,rgba(0,0,0,0.1)_75%,rgba(0,0,0,0.1))] dark:bg-[linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05)),linear-gradient(45deg,rgba(255,255,255,0.05)_25%,transparent_25%,transparent_75%,rgba(255,255,255,0.05)_75%,rgba(255,255,255,0.05))] [background-size:64px_64px] [background-position:0_0,32px_32px]',
    description: 'Blockchain pattern'
  },
  {
    id: 'matrix',
    name: 'Matrix',
    className: 'bg-[radial-gradient(circle,rgba(0,255,0,0.05)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(0,255,0,0.1)_1px,transparent_1px)] [background-size:24px_24px] bg-black/5 dark:bg-green-900/10',
    description: 'Digital rain effect'
  },
  {
    id: 'neon-grid',
    name: 'Neon Grid',
    className: 'bg-[linear-gradient(to_right,rgba(147,51,234,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(147,51,234,0.1)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(147,51,234,0.2)_1px,transparent_1px),linear-gradient(to_bottom,rgba(147,51,234,0.2)_1px,transparent_1px)] [background-size:40px_40px] bg-purple-50/50 dark:bg-purple-900/10',
    description: 'Cyberpunk-inspired grid'
  },
  {
    id: 'crypto-nodes',
    name: 'Crypto Nodes',
    className: 'bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.1)_0%,transparent_50%)] dark:bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.2)_0%,transparent_50%)] [background-size:50px_50px] bg-gradient-to-br from-purple-50/30 to-blue-50/30 dark:from-purple-900/10 dark:to-blue-900/10',
    description: 'Connected nodes pattern'
  },
  {
    id: 'defi-waves',
    name: 'DeFi Waves',
    className: 'bg-gradient-to-br from-purple-500/5 via-blue-500/5 to-green-500/5 dark:from-purple-500/10 dark:via-blue-500/10 dark:to-green-500/10 bg-[url("data:image/svg+xml,%3Csvg width=\'100\' height=\'20\' viewBox=\'0 0 100 20\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M21.184 20c.357-.13.72-.264 1.088-.402l1.768-.661C33.64 15.347 39.647 14 50 14c10.271 0 15.362 1.222 24.629 4.928.955.383 1.869.74 2.75 1.072h6.225c-2.51-.73-5.139-1.691-8.233-2.928C65.888 13.278 60.562 12 50 12c-10.626 0-16.855 1.397-26.66 5.063l-1.767.662c-2.475.923-4.66 1.674-6.724 2.275h6.335zm0-20C13.258 2.892 8.077 4 0 4V2c5.744 0 9.951-.574 14.85-2h6.334zM77.38 0C85.239 2.966 90.502 4 100 4V2c-6.842 0-11.386-.542-16.396-2h-6.225zM0 14c8.44 0 13.718-1.21 22.272-4.402l1.768-.661C33.64 5.347 39.647 4 50 4c10.271 0 15.362 1.222 24.629 4.928C84.112 12.722 89.438 14 100 14v-2c-10.271 0-15.362-1.222-24.629-4.928C65.888 3.278 60.562 2 50 2 39.374 2 33.145 3.397 23.34 7.063l-1.767.662C13.223 10.84 8.163 12 0 12v2z\' fill=\'%239333ea\' fill-opacity=\'0.05\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")]',
    description: 'Flowing DeFi pattern'
  },
  {
    id: 'hash-pattern',
    name: 'Hash Pattern',
    className: 'bg-white dark:bg-black bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239333ea\' fill-opacity=\'0.1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] dark:bg-[url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239333ea\' fill-opacity=\'0.2\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")]',
    description: 'Cryptographic hash symbols'
  }
];

export function useBackgrounds() {
  const [selectedBackground, setSelectedBackground] = useState<Background>(backgrounds[0]);

  return {
    backgrounds,
    selectedBackground,
    setSelectedBackground
  };
}