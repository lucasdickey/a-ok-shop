// Regenerates public/design-concepts/round-five-data.js from product-catalog.json.
// Run from the project root: node session/0923-claude-opus/build-data.cjs
// Lines are lifted from each product's catalog description (lightly trimmed, casing kept).
// Only public fields are exported: no payment-provider ids.
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '../..');
const catalog = require(path.join(root, 'product-catalog.json')).products.edges.map((e) => e.node);

// name: short display name. tag: the opening line. forWho: the "For ..." audience roll call.
// signoff: the closing line. slogan: a poster line for 22. traits: keys into TRAITS for 21.
const VOICE = {
  'hallucination-club-inference-error-edition': { name: 'Hallucination Club', tag: 'You prompt. It answers. You double-check. It hallucinates.', forWho: 'Prompt engineers in denial. Founders who pushed to prod too early. Agents caught in the act. Humans caught believing them.', signoff: 'Error-prone. Token-hungry. Unreasonably confident. Certified A-OK.', slogan: 'Oh no. That wasn’t in the training data.', traits: ['denial', 'prod', 'caught', 'chatbot'] },
  'a-ok-monkey-master': { name: 'Puppet Master', tag: 'Prompt. Control. Loop. Repeat.', forWho: 'For coders, conductors, and chaos agents operating at scale.', signoff: 'Wear it like you’re the one pulling the strings.', slogan: 'The illusion of choice. The rhythm of recursion.', traits: ['orchestrate', 'dj', 'scale'] },
  'a-ok-march-of-the-agents-tee': { name: 'March of the Agents', tag: 'Trained. Tuned. Ready to march.', forWho: 'Great for DevRel agents, startup hype squads, and recursive thinkers with rhythm.', signoff: 'March to the beat of your orchestrator. Or train your own damn agents.', slogan: 'March to the beat of your orchestrator.', traits: ['orchestrate', 'hype', 'devrel'] },
  '1984-ape': { name: '2034 Prophecy Hoodie', tag: 'Inspired by Orwell. Remixed by Apes on Keys. Trained by the Machine.', forWho: 'Perfect for rebel coders, alignment philosophers, and neural nihilists.', signoff: 'Stay aligned—but never unquestioning. It’s all A-OK… for now.', slogan: 'Stay aligned—but never unquestioning.', traits: ['alignment', 'rebel'] },
  'make-america-go-a-ok': { name: 'Make America Go A-OK', tag: 'Step aside, MAGA. The future belongs to the models—and the monkeys.', forWho: 'Features the A-OK mascot rallying a crowd of deepfaked believers.', signoff: 'Because we’ve already gone too far to turn back.', slogan: 'We’ve already gone too far to turn back.', traits: ['rebel', 'hype'] },
  'a-ok-for-america': { name: 'A-OK For America', tag: 'The corporate ape who took “business intelligence” way too literally.', forWho: 'Perfect for founders, forecasters, fine-tuners, chief monkey officers.', signoff: 'Corporate. Feral. Optimized for uncertainty.', slogan: 'Corporate. Feral. Optimized for uncertainty.', traits: ['founder', 'boardroom'] },
  'business-logic-crew-neck-sweatshirt': { name: 'Business Logic', tag: 'Not every agent wears cargo shorts. Some execute protocol in pinstripes.', forWho: 'For the street-savvy strategist, the semantic shuffler, or anyone debugging capitalism in style.', signoff: 'Where business casual meets base-layer intelligence.', slogan: 'Debugging capitalism in style.', traits: ['boardroom', 'founder'] },
  'a-ok-octo-ape': { name: 'Octo Mayhem', tag: '8 Arms. 1 Prompt. 0 Chill.', forWho: 'For burnout poets, recursive bloggers, and agents with a daily word quota.', signoff: 'More limbs. More output. Still A-OK. Prompt hard, write harder.', slogan: 'Prompt hard, write harder.', traits: ['writer', 'burnout'] },
  'a-ok-the-typewriter': { name: 'Hallucinated Keystrokes', tag: 'Vintage Typewriter. Corrupted Output. Still A-OK.', forWho: 'For writers, coders, or anyone who’s argued with a chatbot past midnight.', signoff: 'Reality is optional. Format is eternal. All outputs lead to A-OK.', slogan: 'Reality is optional. Format is eternal.', traits: ['writer', 'chatbot', 'midnight'] },
  'a-ok-glitch-art-face-mask-t-shirt': { name: 'Glitched Vectors', tag: 'Emergent Patterns. Corrupted Glyphs. Something is speaking.', forWho: 'For cipher hunters, glitch gods, and anyone who swears their LLM has feelings.', signoff: 'Find the pattern. Trust the noise.', slogan: 'It’s not a logo. It’s a leak.', traits: ['feelings', 'glitch'] },
  'a-ok-hype-weight-overload': { name: 'Signal in the Noise', tag: 'One voice. Infinite agents. Always aligned.', forWho: 'Ideal for DJs, devs, and anyone trying to rise above the noise floor.', signoff: 'Stay loud. Stay weird. Stay A-OK.', slogan: 'Stay loud. Stay weird. Stay A-OK.', traits: ['dj', 'noise'] },
  'a-ok-we-got-the-keys': { name: 'Got the Keys', tag: 'Drop the beat. Ship the prompt. Unlock the hype cycle.', forWho: 'For founders, beat makers, and anyone who’s pitched “Spotify for prompts” unironically.', signoff: 'The future of music isn’t analog. It’s primate-coded. And yes, we got the keys.', slogan: 'And yes, we got the keys.', traits: ['founder', 'dj', 'hype'] },
  'a-ok-nextjs-is-nice-space-ape': { name: 'Next.js Space Ape', tag: 'Your first framework. Your first fit. Your first monkey in space.', forWho: 'For devs, dreamers, and anyone who ever said “this side project will totally launch.”', signoff: 'Frameworks evolve. Icons endure.', slogan: 'Frameworks evolve. Icons endure.', traits: ['sideproject', 'dev'] },
  'a-ok-12mm-monkeys': { name: '12MM Monkeys', tag: '12 Million Monkeys. One Keyboard. Infinite Outputs.', forWho: 'For time travelers, producers, or anyone training 12 million agents on one GPU.', signoff: 'Prompt responsibly. Monkey on.', slogan: 'Prompt responsibly. Monkey on.', traits: ['gpu', 'dj', 'scale'] },
  'a-ok-recursive-monk-tee': { name: 'Recursive Monk Hoodie', tag: 'Signal Meets Silence.', forWho: 'Perfect for founders, fine-tuners, and followers of the Way of the GPU.', signoff: 'Channel the agent. Become the orchestrator. All is A-OK in the latent space.', slogan: 'Channel the agent. Become the orchestrator.', traits: ['gpu', 'orchestrate', 'founder'] },
  'same-vibes-but-more': { name: 'Day 2 Monkey Hoodie', tag: 'Simplified. Streamlined. Still A Little Scary.', forWho: 'For prompt engineers, digital therapists, and anyone who knows today’s model will be obsolete by next Tuesday.', signoff: 'New look. Same depth. Fully backward compatible. Still hallucinating—but with style.', slogan: 'Fully backward compatible.', traits: ['obsolete', 'denial'] },
  'a-ok-neural-zoo-tee': { name: 'Neural Zoo', tag: 'One shirt. Infinite personalities.', forWho: 'Ideal for LLM prompt whisperers, runaway agents, and rogue embeddings.', signoff: 'Because somewhere inside the latent space… it’s all A-OK.', slogan: 'A haunted house of vibes, simulated confidence, and conflicting personalities.', traits: ['caught', 'feelings'] },
  'mixture-of-apes-finetuned-personalities-tee': { name: 'Mixture of Apes', tag: 'Not just a committee of models — a model of committees.', forWho: 'Perfect for researchers, streetwear fans, and the increasingly online.', signoff: 'Optimized for inference. Prone to vibes. A-OK certified. Uncanny but comfy.', slogan: 'Consensus was never the goal.', traits: ['research', 'online'] },
  'ape-ocalypse-drip-dress-for-the-unknown': { name: 'Ape-ocalypse Drip Hoodie', tag: 'The infinite typewriters got an upgrade.', forWho: 'Built for dawn training runs, late-night keymashing, or stylishly surviving synthetic overlords.', signoff: 'If AGI is inevitable, make sure your drip is unforgettable.', slogan: 'Subtlety is for narrow models.', traits: ['midnight', 'alignment', 'research'] },
  'a-ok-microdose-monkey-tee': { name: 'Microdose Monkey', tag: 'Straight from the labs of an unnamed AI startup run out of a SoMa basement.', forWho: 'Classic fit with extra room for inflated egos or inflated valuations.', signoff: 'Equal parts caution tape and venture-backed swagger.', slogan: 'Definitely for research purposes only.', traits: ['founder', 'online'] },
  'a-ok-basic-ape': { name: 'Basic Ape', tag: 'The original A-OK Ape.', forWho: 'The logo may evolve, but this ape was the beginning of the Symbiocene era.', signoff: 'A perfect balance between fun and sophisticated streetwear styling.', slogan: 'The beginning of the Symbiocene era.', traits: ['dev', 'dj'] },
  'a-ok-this-ape-is-not-okay': { name: 'This Ape Is Not Okay', tag: 'thIs Ape Is nOt OKAy.', forWho: 'The Ape’s determined expression gives the piece An edgy, urbAn feel.', signoff: 'A pOwerful cOntrAst.', slogan: 'This ape is not okay.', traits: ['burnout', 'glitch'] },
  'ape-logo-embroidered': { name: 'Ape Logo Hat (Embroidered)', tag: 'That face. Those headphones. That hat.', forWho: 'You’re twins. It’s recursive.', signoff: 'Nice.', slogan: 'You’re twins. It’s recursive. Nice.', traits: ['dj', 'dev', 'online'] },
  'a-okool-as-a-cucumber-tee': { name: 'A-OKool as a Cucumber', tag: 'Infinite Swag. Zero Latency.', forWho: 'For LLM whisperers, GPU-rich influencers, and anyone who reads arXiv for the drama.', signoff: 'Cool isn’t just a vibe. It’s a pre-trained state.', slogan: 'Cool isn’t just a vibe.', traits: ['gpu', 'research'] },
};

// 21 · The Router. Each chip quotes an audience line from the copy above.
const TRAITS = {
  denial: 'Prompt engineer in denial',
  prod: 'Pushed to prod too early',
  caught: 'Agent caught in the act',
  chatbot: 'Argued with a chatbot past midnight',
  orchestrate: 'I orchestrate agents',
  dj: 'DJ, producer, or beat maker',
  scale: 'Chaos agent operating at scale',
  hype: 'Startup hype squad',
  devrel: 'DevRel agent',
  alignment: 'Alignment philosopher',
  rebel: 'Rebel coder',
  founder: 'Founder (it’s complicated)',
  boardroom: 'Debugging capitalism in style',
  writer: 'Burnout poet / recursive blogger',
  burnout: 'Daily word quota, zero chill',
  midnight: 'Late-night keymasher',
  feelings: 'My LLM has feelings',
  glitch: 'Glitch god / cipher hunter',
  noise: 'Rising above the noise floor',
  sideproject: '“This side project will totally launch”',
  dev: 'Dev, dreamer, first framework',
  gpu: 'Training 12M agents on one GPU',
  obsolete: 'Today’s model is obsolete by Tuesday',
  research: 'Reads arXiv for the drama',
  online: 'Increasingly online',
};

const products = catalog
  .filter((p) => VOICE[p.handle])
  .map((p) => ({
    handle: p.handle,
    title: p.title,
    category: p.productType,
    description: p.description,
    price: Number(p.priceRange.minVariantPrice.amount),
    images: p.images.edges.map((e) => e.node.url),
    options: p.options.filter((o) => o.name !== 'Title').map((o) => ({ name: o.name, values: o.values })),
    variants: p.variants.edges.map(({ node: v }) => ({
      id: v.id,
      title: v.title,
      price: Number(v.price.amount),
      available: v.availableForSale,
      options: Object.fromEntries(v.selectedOptions.map((o) => [o.name, o.value])),
    })),
    ...VOICE[p.handle],
  }));

const missing = Object.keys(VOICE).filter((h) => !products.some((p) => p.handle === h));
if (missing.length) throw new Error('Handles not in catalog: ' + missing.join(', '));

const out = path.join(root, 'public/design-concepts/round-five-data.js');
fs.writeFileSync(
  out,
  `// Generated by session/0923-claude-opus/build-data.cjs. Do not edit by hand.\nwindow.AOK5 = ${JSON.stringify({ products, traits: TRAITS, freeShippingAt: 50, flatShipping: 9.99 }, null, 1)};\n`
);
console.log(`Wrote ${products.length} products to ${path.relative(root, out)}`);
