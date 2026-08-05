import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 127.0.0.1 instead of localhost: HSTS policies are host-specific and
    // can get accidentally cached for "localhost" by some unrelated past
    // project that ran HTTPS there. Raw IP addresses are never subject to
    // HSTS, so this sidesteps that whole class of bug for every developer,
    // with no browser settings to change.
    host: '127.0.0.1',
  },
})
