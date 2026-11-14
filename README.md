# Razeehn Fitness website

Live site: https://imranmohamedosman-sys.github.io/razeehnfit/ (English) and
https://imranmohamedosman-sys.github.io/razeehnfit/ar.html (Arabic). Hosted on GitHub Pages from the `main` branch,
repository root. `.nojekyll` makes GitHub serve the files as they are.

## Fixed decisions
- Online coaching first; in-person personal training and sports massage in Riyadh by request.
- **WhatsApp +966 53 772 7609 is the only booking channel.** No forms.
- **No prices on the site.** Prices, payment and cancellation details are shared on WhatsApp.
- Bilingual: `index.html` (English) and `ar.html` (Arabic, right-to-left). **Change one page, change the other.**
- Spelling: Razeehn in English, رزين in Arabic. Social accounts: @razeehnfit.
- Leave a detail out rather than leaving a blank or inventing it.

## Files
| File / folder | What it is |
|---|---|
| `index.html`, `ar.html` | The English and Arabic pages |
| `404.html` | "Page not found" page. Its links start with `/razeehnfit/` because the site lives in that folder on github.io |
| `css/`, `js/`, `fonts/` | Styles, the small script (menu, floating WhatsApp bar, video player) and self-hosted fonts |
| `media/` | Portrait (`razeehn-photo`), training stills and self-hosted video clips, with WebP + JPEG versions of the pictures |
| `og-image.jpg`, `og-image-ar.jpg` | 1200x630 preview pictures shown when the link is shared |
| `robots.txt`, `sitemap.xml` | Tell search engines they may index the site, and list both pages |

## WhatsApp links
Every WhatsApp link uses `https://wa.me/966537727609?text=...`. Each button has its own prefilled message ending in
"(website)" on the English page and "(من الموقع)" on the Arabic page, so messages that came from the site can be
recognised in WhatsApp. Keep the tag when you add or change a button.

## SEO and sharing (done)
The site's full address is already in place. There is no need to wait for a custom domain.
- Each page has a canonical link, `hreflang` links (en, ar, x-default), `og:url`, and full-address `og:image` and
  `twitter:image`.
- The JSON-LD structured data describes Razeehn, Razeehn Fitness and the four services (no prices), using full
  addresses.
- `sitemap.xml` lists both pages with their language versions, and `robots.txt` points to it.
- When you add a new page, add it to `sitemap.xml` and give it the same canonical/hreflang tags.

## If a custom domain is connected later
1. Buy the domain (optional, costs money), add it in the repository's Settings > Pages > Custom domain, and set the
   DNS records GitHub lists. GitHub then redirects the github.io address to the domain.
2. Replace `https://imranmohamedosman-sys.github.io/razeehnfit/` with the new address everywhere it appears:
   the head and JSON-LD of `index.html` and `ar.html`, `sitemap.xml` and `robots.txt`.
3. In `404.html`, change the `/razeehnfit/` link prefixes to `/`.

## Reflex (reaction training app)
`reflex/` is a reaction and agility training app that installs to the home screen (live at `/razeehnfit/reflex/`).
It is **not linked from the site and is `noindex`** until you decide to launch it. When you do, remove the `robots`
meta tag in `reflex/index.html`, add it to `sitemap.xml` and link it from both pages.
- Drills: random full-screen colours, arrows (4 or 8 directions), numbers, shapes, left/right sides, or colours and
  arrows mixed. Go/no-go "hold" colour, random pause range, cue duration, sets, reps, rest, beep or spoken cues.
- Tests: simple reaction time (5 tries) and left-or-right choice reaction (8 tries); early taps and guesses under
  100 ms are rejected. Results and drill sessions are kept on the athlete's own device (`localStorage`).
- The share button on a drill makes a link (`reflex/#drill=...`) that adds the drill to whoever opens it, e.g. sent on WhatsApp.
- Works offline (`reflex/sw.js`). After changing any file in `reflex/`, bump `VERSION` in `sw.js`.
