# Direct dependency review — 22 October 2026

Every direct runtime and development requirement was checked against the official npm registry's latest stable tag. The website already uses the current compatible stable releases; replacing them with unsupported compiler versions would not improve the upgrade.

| Direct package | Manifest | Installed / latest stable | Decision |
| --- | --- | --- | --- |
| astro | ^7.4.2 | 7.4.2 / 7.4.2 | Current. |
| @astrojs/starlight | ^0.42.6 | 0.42.6 / 0.42.6 | Current, with Astro 7 support. |
| @astrojs/markdown-remark | ^7.3.4 | 7.3.4 / 7.3.4 | Current; preserve the existing Markdown processor. |
| @astrojs/check | ^0.9.12 | 0.9.12 / 0.9.12 | Current; peer accepts TypeScript 5 or 6. |
| typescript | ~6.0.3 | 6.0.3 / 7.0.2 | Keep the latest compatible compiler. Astro/Volar checking uses the TypeScript 6 compiler API; TypeScript 7 is not yet a supported replacement. |

Validation used portable patched Node 24.22.1. Clean npm ci without lifecycle scripts, Astro check (zero diagnostics), build and Pagefind indexing passed. Before/after output has the same 30 routes, text, headings and IDs. A real Chrome mobile check opened Pagefind, returned seven results for optimistic and followed the result to the Optimistic command page. All content and the static deployment model are retained.

The existing manifest ranges allow compatible releases; npm ci reproduces the lock, and neither mechanism refreshes it automatically. For a deliberate update, change direct requirements where appropriate, regenerate the lock without peer bypass, then repeat check/build, route/content comparison, responsive navigation and search. No dependency automation or provider settings were enabled. Existing Cloudflare integration may create a PR preview; no manual or production deployment was performed.

Sources: [official Astro package metadata](https://registry.npmjs.org/astro/latest), [Starlight](https://registry.npmjs.org/@astrojs%2fstarlight/latest), [Astro check](https://registry.npmjs.org/@astrojs%2fcheck/latest), [Markdown integration](https://registry.npmjs.org/@astrojs%2fmarkdown-remark/latest), [TypeScript 7 migration guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/).
