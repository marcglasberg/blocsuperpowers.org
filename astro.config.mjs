// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  site: 'https://blocsuperpowers.org',
  integrations: [
    starlight({
      title: 'Bloc Superpowers',
      favicon: '/favicon.ico',
      customCss: ['./src/styles/custom.css'],
      social: [
        {icon: 'github', label: 'GitHub', href: 'https://github.com/marcglasberg/bloc_superpowers'},
      ],
      components: {
        SocialIcons: './src/components/SocialIcons.astro',
        Hero: './src/components/Hero.astro',
      },
      sidebar: [
        {
          label: 'Tutorial',
          items: [
            // Each item here is one entry in the navigation menu.
            {label: 'Notes app', slug: 'tutorial/notes-app'},
          ],
        },
        {
          label: 'Get started',
          autogenerate: {directory: 'get-started'},
        },
        {
          label: 'Mix function',
          autogenerate: {directory: 'mix-function'},
        },
        {
          label: 'Effects',
          autogenerate: {directory: 'effects'},
        },
        {
          label: 'Advanced',
          autogenerate: {directory: 'advanced'},
        },
        {
          label: 'Optimistic functions',
          autogenerate: {directory: 'optimistic-functions'},
        },
        { label: 'Claude Code Skills', slug: 'claude-code-skills' },
        { label: 'About', slug: 'about' },
      ],
    }),
  ],
});
