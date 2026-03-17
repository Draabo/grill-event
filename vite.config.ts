import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

function dataPlugin(): Plugin {
  const savestateDir = path.resolve(__dirname, 'savestate')

  return {
    name: 'data-plugin',
    configureServer(server) {
      server.middlewares.use('/api/events', (req, res) => {
        const filePath = path.join(savestateDir, 'events.json')

        if (req.method === 'GET') {
          try {
            const data = fs.readFileSync(filePath, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(data)
          } catch {
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ events: [] }))
          }
        } else if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            if (!fs.existsSync(savestateDir)) {
              fs.mkdirSync(savestateDir, { recursive: true })
            }
            fs.writeFileSync(filePath, body, 'utf-8')
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ success: true }))
          })
        }
      })
    }
  }
}

export default defineConfig({
  plugins: [react(), dataPlugin()],
  base: './',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    host: true,
    open: true,
  },
})
