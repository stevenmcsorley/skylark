import type { Config } from 'tailwindcss'

/**
 * Field log: a printed log book, not a dashboard.
 *
 * The app's classes were written against a dark scale (slate-950 darkest ... slate-50 lightest, with
 * text-slate-100 as primary text). The `slate` scale below is that scale turned over: slate-900 is the paper
 * the page is printed on, slate-950 is the white of a panel or field laid on it, slate-100 is ink, so every
 * existing `bg-slate-*` / `text-slate-*` keeps its job (surface, border, primary text, secondary text).
 *
 * Colour has jobs, not decoration:
 *   ink (accent)   primary actions, focus ring, selection
 *   vermilion (red) the one thing that needs you: open errors, fatal, destructive
 *   amber, sky     warning and info levels
 *   green          resolved / healthy, as text and small marks only
 */
export default {
  darkMode: 'media',
  content: [
    './index.html',
    './src/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        slate: {
          50: '#0f1110',
          100: '#17191a',
          200: '#262a27',
          300: '#3c413c',
          400: '#565c55',
          500: '#6a7068',
          600: '#a9aea5',
          700: '#cdd0c8',
          800: '#e7e9e3',
          900: '#f3f4f1',
          950: '#ffffff',
        },
        accent: {
          300: '#3c413c',
          400: '#17191a',
          500: '#17191a',
          600: '#17191a',
          700: '#000000',
          900: '#e4e6e0',
        },
        red: { 300: '#a4281a', 400: '#b42d1c', 500: '#d63a20', 600: '#b8301b', 700: '#962415', 900: '#4b140c' },
        amber: { 300: '#7a5200', 400: '#8f5f00', 500: '#c07f00', 600: '#a56c00', 700: '#855600' },
        sky: { 300: '#1d5a86', 400: '#2a6797', 500: '#3a7fb1', 600: '#2f6a99' },
        emerald: { 300: '#2c6b45', 400: '#2c6b45', 500: '#3c8a5a', 600: '#2c6b45', 700: '#235637', 900: '#e1ebe3' },
      },
      fontFamily: {
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Liberation Mono', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config
