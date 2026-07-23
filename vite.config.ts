import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'
import path from 'path'

// API फोल्डर को dist में कॉपी करने के लिए कस्टम प्लगइन
function copyApiPlugin() {
  return {
    name: 'copy-api',
    closeBundle() {
      const srcDir = path.resolve(process.cwd(), 'api')
      const destDir = path.resolve(process.cwd(), 'dist/api')
      
      if (fs.existsSync(srcDir)) {
        try {
          fs.cpSync(srcDir, destDir, { recursive: true })
          console.log('API folder successfully copied to dist/api')
        } catch (err) {
          console.error('Error copying API folder:', err)
        }
      } else {
        console.warn('API folder not found at ' + srcDir)
      }
    }
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), copyApiPlugin()],
  build: {
    rollupOptions: {
      output: {
        // Split the big, rarely-changing vendor libs into their own cached
        // chunks so the main app bundle is smaller and browser caching is
        // more effective across deploys.
        manualChunks(id: string) {
          if (id.includes('node_modules')) {
            if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) return 'react-vendor';
            if (id.includes('date-fns')) return 'date-vendor';
          }
        },
      },
    },
  },
})
