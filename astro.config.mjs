// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: 'Bloc Superpowers',
      social: [
        {icon: 'github', label: 'GitHub', href: 'https://github.com/marcglasberg/bloc_superpowers'},
      ],
      components: {
        SocialIcons: './src/components/SocialIcons.astro',
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
        { label: 'About', slug: 'about' },
      ],
    }),
  ],
});
