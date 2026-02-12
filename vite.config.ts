import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yaml from '@modyfi/vite-plugin-yaml'
import { copyFileSync } from 'node:fs'

export default defineConfig({
  plugins: [
    react(),
    yaml(),
    {
      name: 'copy-nav-yaml',
      closeBundle() {
        copyFileSync('user-data/nav.yaml', 'dist/nav.default.yaml')
      },
    },
  ],
  server: {
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
})
