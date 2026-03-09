import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
  optimizeDeps: { exclude: ['avoid-nodes-edge'] },
  resolve: {
    dedupe: ['react', 'react-dom', '@xyflow/react', 'zustand'],
  },
})
