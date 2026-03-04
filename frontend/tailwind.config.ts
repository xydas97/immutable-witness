import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0F1923',
        surface: '#1A2535',
        teal: '#00C896',
        blue: '#1A56C4',
        orange: '#E67E22',
        red: '#C0392B',
        'text-primary': '#FFFFFF',
        'text-muted': '#888888',
      },
    },
  },
  plugins: [],
}

export default config
