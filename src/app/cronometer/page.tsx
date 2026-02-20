import type { Metadata } from 'next';
import { CronometerApp } from '@/components/cronometer-app';

export const metadata: Metadata = {
  title: 'Cronometro | CMSA',
  description: 'Cronometro con control de tiempo y costo.',
};

export default function CronometerPage() {
  return <CronometerApp />;
}
