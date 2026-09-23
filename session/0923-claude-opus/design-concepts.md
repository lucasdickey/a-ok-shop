# A-OK Shop: round five — Claude Code / Opus 5.5

September 23, 2026. A hard look at the 20 existing concepts next to the original brand voice (the catalog copy, the site copy, and the product art), then three new concepts, numbered 21–23. Unlike earlier rounds, all three add items to the store's real bag.

## The short version

- **Every round got easier to shop and less like A-OK.** The best writing the brand has is in the product descriptions, and none of the 20 concepts use it. Round four's headlines ("Log off. Stand out.", "Infinite ideas. Choose one.") would work for any brand.
- **The art is the product, and it's been treated as decoration.** The red, black, and bone screen-print posters are the most recognizable thing A-OK owns. Only one of the 20 (06 Wheatpaste Wall) opens with it; the rest open with type, interface chrome, or lifestyle photos.
- **No concept has put anything in the real cart.** Rounds 1–3 link to `#`. Round four has a preview bag that resets and ends at the product page.
- **Recommendation:** use **23 Model Card** as the pattern for product pages and the catalog, **22 Ministry of Alignment** for the homepage or a drop campaign, and **21 The Router** as a "not sure what to get?" entry point (gift finder, email and social links).
- **Fix the four store problems below first.** No redesign gets past a clothing store where most items have no size.

## Before any redesign: four things stopping people from buying

These come from the catalog data and the checkout code, not from taste.

1. **20 of 24 products have no size option.** Only Make America Go A-OK, Hallucination Club, Business Logic, and A-OK For America offer sizes. On every other tee and hoodie, the shopper picks a color and never a size. Round four called this "some records." It's most of the store.
2. **Options are listed that can't be bought.**
   - Hallucination Club lists Purple and White, and a product photo shows purple, but no Purple or White version exists.
   - Make America Go A-OK lists 6 sizes × 3 colors, but only 10 of the 18 combinations exist, with no S or M in any color.
   - A-OKool as a Cucumber is sold out.
   - Two items are filed under the wrong type: the Business Logic crewneck is filed as T-Shirts, and "A-OKool as a Cucumber Tee" is filed as Hoodies.
3. **The game's 25% code can't be used.** `/api/discount` creates the code in Shopify, but checkout is Stripe (`app/api/catalog/checkout/route.ts`), and that session doesn't accept promotion codes. A player who wins has nowhere to enter the code. None of the new concepts mention the discount because of this.
4. **A second color or size of the same product replaces the first.** The product page adds to the cart using the product's id (`ProductPageClient.tsx` passes `id: product.id`). `CartProvider.addToCart` matches on that id and adds to the quantity of the existing line, which keeps the first variant. If someone adds a Red M and then a Green L, the order becomes 2 × Red M. The round-five concepts key by variant to avoid this. Fixing it in the store is a one-line change, but it's outside this round.

## What the original voice actually is

From the 24 catalog descriptions, the homepage theorem, and the footer:

- **Specific and a bit too much.** It names its targets: Orwell and Apple's 1984 ad, Suno and Udio, MAGA, *12 Monkeys*, Kafka, "the guy at OpenAI who won't stop quoting GPT-3."
- **A fixed structure, repeated across the catalog:**
  - a three-part opener: "8 Arms. 1 Prompt. 0 Chill."
  - a short story about the ape
  - spec bullets that parody product specs: "Classic fit with extra room for inflated egos or inflated valuations"
  - an audience roll call: "For burnout poets, recursive bloggers, and agents with a daily word quota"
  - a sign-off: "More limbs. More output. Still A-OK."
- **In on its own joke.** A brand made by people and models, joking about models making things up: "we believe in looking informed even if we hallucinate the citations."
- **Visual.** Red, black, and bone screen print in a WPA or propaganda-poster style. One ape with headphones and a cap. Real friends wearing the clothes in real places.

## Where each round drifted

| Round | Where the joke lived | What was lost |
| --- | --- | --- |
| Cursor · 01–05 | In the page design: terminal, glitch, CRT, particles | The words shrank to a tagline. Four of five treat the store as software, not clothing. |
| Droid / Grok · 06–10 | In a metaphor: wall, reasoning trace, journal, rack, billboard | 06 is the only concept of the 20 that opens with the art. 07's "The model already dressed you" is the closest any round got to the voice. |
| Codex / Sol · 11–15 | In an institution: museum, field guide, transit, receipt | The voice turned polite. "Objects for thinking bodies" could sell furniture. |
| Codex / GPT-6 · 16–20 | Mostly nowhere; tidy fashion lines | Honest and easy to shop, but the copy was smoothed into lines any label could use. "Good taste. Bad data." is the exception. |

## What none of the 20 did

1. **Open with the art as the product.** The shirts are the posters.
2. **Use the whole catalog.** Round four used 6 of 24 pieces, and the green Hallucination Club tee appears in all five of its concepts. Puppet Master, 2034 Prophecy, Octo Mayhem, Recursive Monk, and Business Logic barely show up anywhere.
3. **Put anything in the real bag.**
4. **Use the audience roll calls.** Every description already says who it's for. That's a ready-made way to choose.
5. **Use the political and corporate parody.** 2034 Prophecy, Make America Go A-OK, March of the Agents, A-OK For America, and Business Logic form a clear thread that no concept touched.
6. **Give an honest reason to add a second item.** Checkout gives free shipping at $50 and charges $9.99 below that. March of the Agents and Mixture of Apes are $40 and Hallucination Club is $45, so for those shoppers a second piece nearly pays for its own shipping. That's true, and it doesn't need a fake countdown.
7. **Treat missing sizes as the main blocker.**

What round four got right, and this round keeps: real catalog data, no fake urgency, reviews, or stock counts, keyboard support, and respect for reduced-motion settings.

## Three new concepts

All three read `round-five-data.js`, which `build-data.cjs` generates from `product-catalog.json`. Every product line (tagline, audience, sign-off, poster slogan) is lifted from that product's description, lightly trimmed. The Router's chips are short versions of the audience lines. The framing copy (headlines, labels, the Ministry and model-card wording) is new, written to match the voice. All three share `round-five-cart.js` for the real bag.

### 21 — The Router

*Mixture of Apes as a shopping tool.*

The Mixture of Apes tee jokes that a model is a committee of experts with a router choosing between them. Here the 24 pieces are the experts and the shopper is the prompt. They tap short versions of the audience lines from the copy ("Prompt engineer in denial", "Argued with a chatbot past midnight", "Founder (it's complicated)"). The router ranks pieces by how many of those lines appear in each piece's copy and shows the top two.

- **Voice:** "You are the prompt. Pick your tokens." / "system: the router read the product copy. system: that is all it read. system: it is still unreasonably confident."
- **Getting to the bag:** it replaces 24 choices with one, with options and add-to-bag right on it. The second pick sits underneath with a line saying whether it covers free shipping.
- **Honesty:** the "router weights" panel shows the actual scoring, which is just a count of matching lines. Nothing is dressed up as AI.
- **Risk:** chips are a small task before shopping. People who already know what they want should skip straight to the store, so it shouldn't be the only way in.
- **Best use:** gift finder, a link from social posts or email, or a panel on `/products`.

### 22 — Ministry of Alignment

*The posters lead. The shirts are the decrees.*

A state-propaganda parody built from the brand's own art ("Destination: Alignment / Destination: Acceleration" is the hero). Each of eight pieces gets a full screen: its flat artwork at full size, its own slogan as the headline ("Stay aligned—but never unquestioning.", "Corporate. Feral. Optimized for uncertainty."), who it's "issued to" (the audience line), a photo of it being worn, and a requisition form with the real options.

- **Voice:** "Report for fitting. The models have been issued their instructions. You have been issued a choice of shirt. The Ministry recommends you use it before someone fine-tunes that away too."
- **Getting to the bag:** a ration card stays on screen. It stamps off each $10 toward the $50 free-shipping line and, when you're short, names the cheapest pieces that would close the gap on their own, at real prices. "The Ministry does not negotiate."
- **Risk:** the political parody is sharp by design. The brand already sells Make America Go A-OK, but a homepage built on it takes a clearer stance than a single product does. Posters also take a lot of scrolling on phones.
- **Best use:** homepage for a drop, or a campaign page. Its layout for each piece is also a strong product page pattern.

### 23 — Model Card

*Every piece ships with its documentation.*

AI models come with "model cards." Here each piece gets one:

- **Model summary:** the opening line.
- **Intended use:** the audience roll call.
- **Out-of-scope use:** "Being the only person in the room who gets the joke. Deploy a second checkpoint for a friend."
- **Known limitations:** the honest gaps, stated plainly ("No size option is published for this checkpoint yet", "Photos are not matched to the color you pick").
- **Training data:** the full description, not cut short.
- **Evaluation:** price, colors, sizes, and whether the piece ships free on its own.
- **Citation:** the sign-off as a BibTeX entry with `doi = {hallucinated}`.

- **Voice:** "24 checkpoints. All fine-tuned on the same ape." Search placeholder: "try 'founder' or 'hallucinate'." Empty search: "No checkpoints matched. The model is confident they exist anyway."
- **Getting to the bag:** all 24 pieces are searchable (including the full description text), and "Deploy to bag" sits beside every card. Hiding a limitation costs more trust than stating it, and stating it in the brand's voice turns a catalog gap into a joke instead of a surprise.
- **Risk:** it's the densest of the three. It works best for people who already like the brand; newcomers may want the poster version first.
- **Best use:** the model for `/products` and product detail pages. It needs no new photography.

## How the real bag works in these prototypes

- The store keeps its cart in `localStorage["cart"]` (`app/components/cart/CartProvider.tsx`). The concepts are served from the same site, so they write items in the same shape, and those items show up in the store's cart drawer.
- Items are keyed by variant id, so different sizes and colors stay on separate lines.
- Checkout re-prices every line on the server from the catalog by `variantId`. A concept page can't set a price, and nothing is charged from a concept page. "Review bag & check out on the store" goes to `/products`, where the cart button shows the count and the normal checkout runs.
- **Worth knowing:** `/design-concepts/` is public on the live site, so anyone who finds these pages can add real items to their own bag. That's the point of this round, but it's a change from earlier rounds.
- **Small follow-up if a concept moves forward:** the store has no way to open the cart drawer from a link. A `?bag=open` check in `CartProvider` would let the handoff land with the drawer already open.

## What to measure

Compare each concept against the current homepage, split by phone and desktop:

- add-to-bag rate per visitor
- items per bag, and the share of bags at $50 or more
- checkout starts and completed purchases

Concept-specific signals:

- **21:** the share of visitors who pick at least one line, and add rate with versus without picking.
- **22:** how often a ration-card suggestion is clicked, and how often it's then added.
- **23:** how often "Read the full training data" is opened, compared with add rate on that card.

`@vercel/analytics` is already installed. These prototypes don't send events yet. That would be the next step if one moves toward production.

## Files

- `public/design-concepts/21-the-router.html`, `22-ministry-of-alignment.html`, `23-model-card.html`
- `public/design-concepts/round-five-cart.js`: shared real-bag helpers and option picker
- `public/design-concepts/round-five-data.js`: generated; public product fields only, no payment-provider ids
- `session/0923-claude-opus/build-data.cjs`: regenerates the data file. Run `node session/0923-claude-opus/build-data.cjs` after catalog changes.
- `app/concepts/concepts.ts`, `app/concepts/ConceptsGallery.tsx`: round five in the `/concepts` viewer, which now opens on it
- `public/design-concepts/index.html`: three new cards

No new packages. No changes to checkout, the cart provider, product pages, or the production homepage.

## Verification

- Drove all three pages in Chromium at 1440px and 390px. On each, picked options, added to the bag, and read back `localStorage["cart"]`: correct titles, prices, variant ids, sizes, and colors, one line per variant.
- The option picker never offers a combination that doesn't exist. Picking a value snaps the other options to a combination that does. Hallucination Club Purple and White show as unavailable because the catalog has no variants for them.
- The Ministry ration card with only March of the Agents ($40) in the bag reads "$10 short of free shipping" and suggests Mixture of Apes ($40) or Hallucination Club ($45).
- No horizontal scrolling on phones. No script errors. (Google Fonts were blocked by this sandbox's network, so screenshots show fallback fonts.)
- End to end on a production build (`next start`): added A-OK For America (L / Black) on 22, followed the checkout link to `/products`, and the store's own cart button showed 1 with the right size, color, and $60 price in the drawer. Stopped before Checkout, so Stripe was not called.
- `/concepts` opens on round five.
- `npm run lint`: passes, with the same 11 warnings in existing files and none in these changes. `npm run build`: passes. The repo has no test script.
