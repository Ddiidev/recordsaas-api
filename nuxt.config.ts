export default defineNuxtConfig({
  ssr: true,
  css: ['~/assets/css/landing.css'],
  app: {
    head: {
      htmlAttrs: {
        lang: 'en',
      },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
      link: [
        { rel: 'icon', href: '/assets/logo.png', type: 'image/png' },
      ],
      script: [
        {
          src: 'https://accounts.google.com/gsi/client',
          async: true,
          defer: true,
        },
        {
          tagPosition: 'head',
          children: `(function(){
            try {
              var savedTheme = localStorage.getItem('recordsaas_theme') || 'system';
              if (savedTheme !== 'system') {
                document.documentElement.setAttribute('data-theme', savedTheme);
              } else {
                var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
              }
            } catch (_) {}
          })();`,
        },
      ],
    },
  },
  nitro: {
    prerender: {
      routes: ['/'],
      crawlLinks: false,
    },
  },
})
