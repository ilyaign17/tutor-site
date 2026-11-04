// Keep the version and theme aligned with the former Play CDN configuration.
module.exports = {
  content: ['./index.html'],
  // JS toggles custom CSS classes (nav-ready, is-open, is-enhanced, is-active).
  // Their rules remain in index.html; no dynamic Tailwind utilities need safelisting.
  theme: {
    extend: {
      colors: {
        bg: '#0b0f1a',
        card: '#101726',
        accent: '#6ee7b7',
        accent2: '#60a5fa',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(110,231,183,.25), 0 0 20px rgba(96,165,250,.15)'
      },
      keyframes: {
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' }
        },
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(12px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' }
        }
      },
      animation: {
        floaty: 'floaty 5s ease-in-out infinite',
        fadeUp: 'fadeUp .8s ease forwards'
      }
    }
  }
}
