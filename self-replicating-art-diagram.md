```mermaid
graph TD
    subgraph "Self-Replicating Art System"
        A[index.ts - Main Coordinator] --> B[fetchShopifyMedia.ts]
        A --> C[listGridImages.ts]
        A --> D[craftPrompt.ts]
        A --> E[generateImage.ts]
        A --> F[saveImageLocally.ts]
        
        B[fetchShopifyMedia.ts] -->|Fetches product<br>images & descriptions| G[Shopify GraphQL API]
        C[listGridImages.ts] -->|Fetches existing<br>gallery images| H[a-ok.shop/api/gallery]
        
        D[craftPrompt.ts] -->|Creates AI prompt<br>from media + brand rules| I[OpenAI DALL-E 3 Prompt]
        I -->|Input for<br>image generation| E[generateImage.ts]
        E -->|Generated<br>1024x1024 image| F[saveImageLocally.ts]
        
        F -->|Saves with<br>date filename| J[public/daily/YYYY-MM-DD.png]
        F -->|Updates| K[manifest.json]
        F -->|Triggers| L[Vercel Deploy Hook]
    end

    subgraph "A-OK Shop Gallery"
        M[app/gallery/page.js] --> N[app/api/gallery/route.js]
        N -->|Reads images from| O[public/images/hp-art-grid-collection]
        P[app/components/ImageGrid.tsx] -->|Displays images<br>in bento grid| M
    end

    %% The Reinforcing Loop
    J -->|New images become<br>part of collection| O
    O -->|Existing art influences<br>new generation| C
    
    %% Styling
    classDef system fill:#f9d5e5,stroke:#333,stroke-width:2px
    classDef component fill:#eeeeee,stroke:#999,stroke-width:1px
    classDef flow fill:#e3f2fd,stroke:#333,stroke-width:1px
    classDef feedback fill:#ffebee,stroke:#d32f2f,stroke-width:2px,stroke-dasharray: 5 5
    
    class A,B,C,D,E,F system
    class G,H,I,J,K,L,M,N,O,P component
    class J,O flow
    class J,O,C feedback

    %% Feedback loop highlight
    J -.->|Reinforcing<br>Creative Loop| C
```

## Self-Replicating Art System: Reinforcing Creativity Loop

This diagram illustrates how the self-replicating art system works in conjunction with the A-OK Shop gallery to create a reinforcing creative loop:

1. **Data Collection Phase**:
   - System fetches existing visual content from Shopify products
   - System fetches existing gallery images from a-ok.shop/api/gallery
   
2. **Generation Phase**:
   - Crafts AI prompts combining brand rules and existing imagery descriptions
   - Generates new images via OpenAI's DALL-E 3
   - Saves generated images with date-based filenames (YYYY-MM-DD.png)
   - Updates manifest.json and triggers deployment

3. **Display Phase**:
   - A-OK Shop gallery displays images in a responsive grid layout
   - New AI-generated images become part of the gallery

4. **The Reinforcing Loop**:
   - Each day's new AI-generated image becomes part of the collection
   - These images then influence future generations via the prompt crafting
   - The system evolves while maintaining brand consistency
   - Visual style adapts over time while preserving core brand identity

This creates a "self-replicating" art system where new creations are influenced by previous creations, forming a continuously evolving visual identity within the defined brand parameters.