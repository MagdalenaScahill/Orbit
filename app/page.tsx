'use client';
import { ReactFlowProvider } from 'reactflow';
import { OrbitGraph } from '@/components/OrbitGraph';
import { ThemeProvider } from '@/components/ThemeProvider';

export default function Home() {
  return (
    <ThemeProvider>
      <ReactFlowProvider>
        <OrbitGraph />
      </ReactFlowProvider>
    </ThemeProvider>
  );
}
