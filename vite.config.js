import { defineConfig } from 'vite'
const repo = (process.env.GITHUB_REPOSITORY ?? '').split('/')[1]
const base = process.env.GITHUB_PAGES === 'true' && repo
  ? `/${repo}/`
  : './'

export default defineConfig({
  base,
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
})
