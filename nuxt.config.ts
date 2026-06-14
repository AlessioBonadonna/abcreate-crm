// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss'],
  tailwindcss: {
    cssPath: '~~/assets/css/tailwind.css',
    configPath: '~~/tailwind.config.js',
  },
  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `npm run typecheck`
  },
  runtimeConfig: {
    // Server-only secrets (override with NUXT_ prefixed env vars)
    googlePlacesApiKey: process.env.GOOGLE_PLACES_API_KEY || '',
    public: {
      appName: 'AB Create CRM',
    },
  },
})
