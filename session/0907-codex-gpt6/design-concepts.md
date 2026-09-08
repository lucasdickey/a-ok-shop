# A-OK Shop: round four — Codex / GPT-6

September 7, 2026. Five additional, interactive design prototypes, numbered 16–20. The previous fifteen remain available. Open `/concepts` for the comparison viewer; it starts on the newest round. `/design-concepts/` is the direct-link index.

## Recommendation

**16 — Human Standard is the strongest main-store direction. Pair it with 20 — The Living Index for the catalog, and borrow 17 — Open Studio for the art and generator experience.**

Museum Store was the best system in the previous round. Reconsidering it against the explicit priority of selling clothes, Human Standard has the better starting point: the existing crimson/bone palette, real people wearing actual garments, a dry AI joke, and a visible piece with a price. It feels like Apes On Keys before it feels like a design metaphor. Museum Store remains useful for artwork captions and collection structure, but does not need to define the whole shop.

This is a design judgment, not a measured conversion result. The prototypes expose the interactions needed to evaluate the hypothesis; they do not establish that purchases will increase.

## Re-review of the first fifteen

The previous session notes, the September 1 audit, the current catalog/homepage, and prototype source informed this review. The old live-site audit is historical evidence, not a claim that its production bugs were re-tested today.

| Earlier concept | Keep | Reconsider under this brief |
| --- | --- | --- |
| 01 Terminal Hacker | Short developer jokes and recognizably A-OK language | Command-line conventions should not be required to understand shopping. |
| 02 Glitch Brutalist | Crimson, strong type, confident contrast | Continuous glitch and competing headlines make product choices harder to scan. |
| 03 Streetwear Editorial | Garments worn by real people; calm commerce hierarchy | Needs more specific brand voice and a connected art practice. |
| 04 Retro Arcade | A self-contained game identity | The game should be a voluntary detour, not the store's organizing idea. |
| 05 Signal & Noise | Restrained dark palette | Atmospheric canvas work adds little to purchase decisions. |
| 06 Wheatpaste Wall | A-OK's actual street-art archive | Layered posters are better as a campaign or studio moment than the entire catalog. |
| 07 Inference Trace | Contemporary AI humor | A thinking rail competes with garments; shopping should not wait for a simulated model. |
| 08 Research Issue | Captions, collections, and editorial discipline | Long academic framing makes the clothes feel like illustrations for an essay. |
| 09 Patchbay Studio | Ties to the broader music/art portfolio | Hardware metaphors need explanation and are too niche for every purchase. |
| 10 Supergraphic | A confident wordmark and a memorable cover | Huge type cannot displace price, garment detail, and the next action. |
| 11 Museum Store | Durable collection system; curated rather than random art | The voice risks becoming institutional. Its mobile menu and bag are decorative. |
| 12 Field Guide | Category clarity and useful short captions | The outdoor metaphor can misrepresent ordinary streetwear. |
| 13 Transit Authority | Visible navigation and wayfinding | Too much route decoding for a small catalog. |
| 14 Receipt Machine | Price visibility and clear line items | A clever campaign; not necessarily an aspirational clothing brand. |
| 15 Soft Machine | Approachable tone and generosity | Softness can erase the sharper AI satire. Its generator is absent as an interaction. |

Source inspection also found placeholder `href="#"` links in every previous concept. Concepts 11–15 each have a menu button and no script, so those mobile menus cannot open. In 11, example prices are $35/$65/$30 for Basic Ape/Business Logic/Ape Logo; the repository catalog instead lists $50/$53.14/$75. These differences are why the new pass uses extracted catalog data, including variant availability, rather than invented merchandising claims.

## Five new concepts

### 16 — Human Standard

Crimson cover, condensed type, bone UI, and a candid garment photograph. “Great models. Better taste.” keeps the AI joke brief and leaves room for the clothing.

- **Buying hypothesis:** Reduce the gap between brand interest and a specific wearable item. Hero price/action, readable category controls, and option selection do the work.
- **Brand:** Closest to the existing palette and dry, technically literate voice. Category accents evolve the tee/hoodie/hat color system.
- **Art and game:** An archive strip and generator workbench follow the collection. The game occupies one compact row and loads only on demand.
- **Tradeoff:** The strongest permanent shop, but less art-directed than Open Studio. Higher-resolution lifestyle photography would improve a production hero.

### 17 — Open Studio

Cobalt directory beside a loose workbench: a finished tee and an A-OK wheatpaste study share the table. The mobile directory becomes a compact introduction and working navigation.

- **Buying hypothesis:** Make the art practice increase the desirability of a finished product. The featured garment has a direct option picker; the catalog remains conventional.
- **Brand:** Shows the actual relationship between creative experiments and the label, without pretending that an unrelated artwork is the literal source of a tee.
- **Art and game:** The generator is part of the studio. Artwork opens for inspection; the game remains a side activity.
- **Tradeoff:** Best art-brand expression. The cobalt direction departs farther from A-OK's established palette, and mobile shoppers must scroll farther to the first detailed product action.

### 18 — Hallucination Club

Yellow and crimson, club graphics, oversized condensed type, and a selectable product in an arched frame. “Good taste. Bad data.” turns the shared AI joke into an invitation.

- **Buying hypothesis:** Three named personas make selecting a first piece approachable. Switching persona changes the image, name, price, and option-picker target together.
- **Brand:** Most expressive and campaign-ready; no fake membership gate or signup requirement.
- **Art and game:** The image-generator concept is a creative activity, not a prerequisite for buying. Art and play are below the collection.
- **Tradeoff:** Excellent drop/campaign direction. The big headline should be tested against a more compact mobile introduction.

### 19 — After Hours

Charcoal, warm white type, one crimson purchase accent, and a shoppable photographic contact sheet. “Log off. Stand out.” is the fashion-led answer to AI saturation.

- **Buying hypothesis:** Show clothes in human contexts to make them easier to imagine wearing. Each contact-sheet frame opens the associated product.
- **Brand:** Keeps humor and the ape identity without terminal chrome, neon, or ambient particle effects.
- **Art and game:** A restrained art interlude plus the same studio interaction. The existing game loads only when requested.
- **Tradeoff:** Strong fashion direction; production would benefit from photography with consistent light and higher resolution. Supplied daylight photographs are not presented as new night photography.

### 20 — The Living Index

A short proposition above the catalog itself. Filters, price sorting, and grid/list views let the user choose their own browsing density.

- **Buying hypothesis:** The shortest route from arrival to a piece, with low information overhead and prices next to product names. A useful candidate for a product-focused campaign destination or `/products` redesign.
- **Brand:** Red type, A-OK photography, and “Infinite ideas. Choose one.” retain personality without making the catalog a puzzle.
- **Art and game:** A small generator entry near the intro, full art module after the catalog, and the game at the bottom.
- **Tradeoff:** Best utility; less emotional storytelling than Human Standard. Do not infer an actual conversion lift without traffic and completed-purchase data.

## What “newer model” means in this pass

The advance is in execution: five different compositions, a reusable interaction layer, responsive states, real catalog data, explicit unavailable options, keyboard-accessible dialogs, and an art-to-commerce path. There are no invented model release facts, fake real-time inference traces, automatic shopping agents, fabricated reviews, false stock countdowns, or made-up delivery promises.

The generator is a **clearly labeled interaction prototype**, with an editable prompt, direction selector, three existing artwork samples, and prompt copying. It does not generate new images or call a paid model. A production integration should connect the separate self-replicating-art service with real loading, error, moderation, and cost handling, without holding up the storefront. This request implements concepts, not that service integration.

## Scope and implementation

- Five HTML prototypes under `public/design-concepts/`, plus shared `round-four.css`, `round-four.js`, and a minimal `round-four-data.js` catalog snapshot.
- `build-concepts.cjs` regenerates those HTML files and the public catalog subset from the repository's `product-catalog.json`. Run from the project root with `node session/0907-codex-gpt6/build-concepts.cjs` after source-catalog changes.
- Only public product names, descriptions, images, options, prices, and variant identifiers/availability are included in the snapshot. Provider payment IDs and credentials are excluded.
- Product options, cart quantities, subtotal, category filtering, sorting, responsive navigation, art inspection, generator sample selection, and the game modal are interactive. The bag is page-local and clearly marked as a preview. Actual purchase links open existing product pages; nothing is transferred to checkout.
- The six products are a curated sample, not the complete store. Full-catalog links reach the existing shop.
- Options follow the catalog exactly. Some apparel records lack size options, and Business Logic is categorized as `T-Shirts` despite its sweatshirt title. The prototype calls out missing sizing and does not silently invent or correct source data. Catalog cleanup is a production prerequisite.
- Product photos are not mapped to selected colors; the detail view states that limitation. Multi-image controls allow inspection without falsely recoloring products.
- Art samples and product images use existing A-OK assets. The game iframe is absent until the user opens it, and removed when closed.
- Shared commerce controls make cross-concept comparison more meaningful. The homepage layout, typography, palette, photo composition, and unique interaction differ by direction.
- No changes to checkout, production homepage, generator backend, discounts, or deployment configuration.

## Evaluation plan

Compare 16 and 20 against the current storefront. Track product-detail opens, option completion, add-to-cart, checkout initiation, and completed purchase per visitor. Segment mobile/desktop; monitor purchase conversion, revenue per visitor, and performance so extra art engagement is not mistaken for shopping success. Do not optimize for game starts. Treat generator/archive engagement as secondary, and check how often people return to the catalog afterward.

## Verification

- `npm run lint`: passed; existing warnings elsewhere in the application remain.
- `npm run build`: passed, including the image-list prebuild and the `/concepts` page.
- Desktop visual review of all five concepts at 1280px; phone review of all five at 390px, with no horizontal document overflow observed.
- Tested Hallucination Club Green / M selection and unavailable colors; add to preview bag ($45), quantity increment ($90), removal ($0).
- Tested Hats filter (one piece), low-to-high price sort ($40, $45, $50, $53.14, $75, $75), and mobile list layout.
- Tested featured-persona switching in 18, mobile menu expansion, generator prompt editing and sample-direction changes, and lazy loading of the existing game into a dialog.
- Verified the gallery lists all 20 concepts, defaults to round four, and supports origin filtering, previous/next traversal, and the 390px mobile preview.
- The production checkout and paid image generation were not invoked. The historical gallery failure was not re-audited or fixed as part of this concept pass.

## Micro-interaction pass

Added only to round four (16–20); previous concepts, the shared comparison viewer, and the production storefront are unchanged by this pass.

- **Human Standard:** subtle photographic zoom and a lifted purchase label; crisp button press and category feedback.
- **Open Studio:** the two paper studies straighten and lift on hover or keyboard focus. They now open the product and artwork respectively. Directory links nudge in their travel direction.
- **Hallucination Club:** the stamp turns toward the shopper, selector changes give a brief tactile response, and product-image changes fade in once the image is available.
- **After Hours:** hovered or keyboard-focused contact-sheet photographs gain warmth/brightness and their captions highlight. No continuous animation.
- **The Living Index:** precise card/row edge highlights, animated repositioning after filtering/sorting, and brief feedback on grid/list changes.
- **Across this round:** navigation underlines, clear hover/focus/pressed/disabled states, a short dialog entrance, a sliding preview bag, subtotal feedback, art-image transitions, and a copied-prompt confirmation.

Transitions run roughly 160–450ms (650ms for the subtle hero crop). Content is never gated by a scroll reveal; no artificial wait is added to the generator demo or purchase controls. Touch devices retain visible controls without relying on hover. Reduced-motion preference disables CSS motion, skips JavaScript animations, and cancels active JavaScript animations when the preference changes.

Validated JavaScript syntax and whitespace, keyboard activation of the studio cards and art dialog, category filtering, persona switching, and the Green / M → $45 preview-bag flow with the new motion layer. The native dialogs apply the intended entrance/slide animations. No checkout or game reward was invoked.
