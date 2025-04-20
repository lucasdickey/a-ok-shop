
# Coding Agent Prompts for A-OK Custom Shopify Storefront

These prompts are designed to guide an AI coding agent (e.g., GPT-4, Claude, Cursor) through building a custom storefront using **Next.js + Tailwind CSS + TypeScript** with a **Shopify Storefront GraphQL API backend**, deployed on **Vercel**. Prompts are broken into modular tasks for clarity, reusability, and step-by-step execution.

---

## 🧱 1. Project Setup

**Prompt:**
```
Set up a new Next.js 14+ project using TypeScript and Tailwind CSS. Use the App Router, not the Pages Router. Configure Tailwind with a custom color palette inspired by these colors: black, white, crimson red, and soft cream. Output a complete file structure. Ensure it is ready to deploy on Vercel.
```

---

## 🔌 2. Shopify Storefront API Client

**Prompt:**
```
Set up a Shopify Storefront GraphQL API client using `graphql-request`. Use environment variables for API key and store domain, stored in `.env.local`. Export a function that allows making typed GraphQL requests. Include example types for a product list query using TypeScript.
```

---

## 🏷️ 3. Product Listing Page with Filters

**Prompt:**
```
Create a `/products` route that fetches and displays a list of products from Shopify using the Storefront GraphQL API. Add client-side filtering for product tags/types and price. Include a responsive grid layout using Tailwind. Products should display image, title, price, and link to the product detail page.
```

---

## 📄 4. Product Detail Page

**Prompt:**
```
Create a dynamic product detail page using the route `/products/[handle]`. Use the handle to fetch product data (images, title, description, price, available variants) from Shopify via GraphQL. Include an “Add to Cart” button. Use Tailwind to style the page responsively.
```

---

## 🛒 5. Cart Drawer with Local Storage

**Prompt:**
```
Build a shopping cart drawer that slides in from the side when a user adds an item. Use a React Context or Zustand store to manage cart state and persist it using `localStorage`. Include product image, name, price, quantity, and a "Go to Checkout" button. Checkout should link to the Shopify-hosted checkout URL generated via a Storefront API `checkoutCreate` mutation.
```

---

## 🔐 6. Environment Variables + Vercel Deployment

**Prompt:**
```
Set up environment variable handling for the following: `SHOPIFY_API_KEY`, `SHOPIFY_STORE_DOMAIN`. Use `.env.local` for local development. Provide Vercel deployment instructions, including how to set environment variables in the Vercel dashboard and how to enable preview deployments for branches.
```

---

## 🧩 7. Optional Homepage CMS Blocks

**Prompt:**
```
Create optional content blocks for the homepage: a hero section with image + headline, a full-width banner, and a text section. Use a simple JSON content store or flat file for now. The layout should conditionally render these blocks only if data is present. Style with Tailwind. We’ll add TipTap later as a future enhancement.
```

---

## 🚫 8. Skip Auth, SEO, and Analytics (for now)

**Prompt:**
```
Ensure the app does not include any authentication logic, internationalization, or analytics tracking. Everything is in English, USD, and available for purchase in the US. Leave clear TODO comments where these might be added later.
```

---

## ✅ Final Task: README Scaffold

**Prompt:**
```
Generate a README.md file for this project. It should include setup instructions, .env guidance, deployment steps for Vercel, and future TODOs (like TipTap CMS, analytics, countdowns for product drops). Add badges for Vercel deployment, tech stack (Next.js, Shopify, Tailwind, TypeScript).
```

---

# 🔄 Future Prompts (for v2)

- TipTap CMS integration for editing hero/banner/text
- Countdown timer for limited drops
- Post-purchase upsells or thank-you animations
- Analytics + pixels (GA4, FB, etc.)
- Static content pages (About, FAQ)
