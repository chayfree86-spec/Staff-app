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
})
