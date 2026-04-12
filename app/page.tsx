"use client";
import { useState } from 'react';
import LandingScreen from '../components/LandingScreen';
import PhotoBooth from '@/components/photobooth';

export default function Home() {
  const [hasEntered, setHasEntered] = useState(false);

  return (
    <main className="bg-black">
      {!hasEntered ? (
        <LandingScreen onEnter={() => setHasEntered(true)} />
      ) : (
        <PhotoBooth />
      )}
    </main>
  );
}