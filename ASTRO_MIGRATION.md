# Astro migration and future updates

The site now uses Astro ^7.4.2 and its native Vite8 dependency range. The Vite override is removed. The migration was reviewed and built sequentially through Astro6.4.8, then Astro7.4.2; installed final Vite is8.3.5.

The project .nvmrc selects tested Node24.22.1 for local/build-host use. engines permits the patched22/24/26 release lines; no host-wide Node installation or provider settings were changed. Cloudflare Pages must build from this project directory and honor this runtime declaration; verify actual preview logs before merging if the provider overrides it. Node24 is the preferred LTS build line. Use nvm install to download a newer tested patch, update .nvmrc and verify the preview, rather than assuming nvm use downloads updates.

compressHTML:true retains prior inline spacing behavior across Astro7's changed default. The output remains static. The before/after HTML route inventory and heading IDs are unchanged. No content pages or public routes were removed.

Starlight is ^0.42.6 with its compatible Astro7/MDX peers. The official unified Markdown processor retains remark/rehype/expressive-code behavior. Sidebar groups use the current items/autogenerate shape. Astro owns its Sharp dependency; the unused redundant direct Sharp dependency was removed. Check/build passed (30pages); all main content text and heading IDs match the baseline. Browser checks covered desktop/mobile layout, sidebar/menu, code blocks, and Pagefind search results followed to a documentation page.

Use npm ci for the reproducible committed graph. For updates, review npm outdated and compatible official integration peers, use the official Astro upgrade guides for major boundaries, regenerate/commit the lock and repeat check/build, route/anchor and responsive/browser validation. Version ranges allow updates but do not refresh the lock automatically. A separately reviewed dependency-update PR configuration is a useful follow-up; this change does not enable apps, background schedules or auto-merge. No dependency policy eliminates future maintenance.

Sources:
- https://docs.astro.build/en/guides/upgrade-to/v6/
- https://docs.astro.build/en/guides/upgrade-to/v7/
- https://v3.tailwindcss.com/docs/installation/using-postcss
- https://docs.astro.build/en/guides/styling/#postcss
