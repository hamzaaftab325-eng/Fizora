# FIZORA — Find your fizz

An immersive, responsive sparkling-drink website built with React, Three.js, and Vite. Three flavor chapters combine rotating product cans, full front/back labels, interactive liquid backgrounds, and floating bubbles.

## Run locally

Use Node.js 22 and pnpm 10.11.0 (the exact package-manager version is recorded in `package.json`).

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm dev
```

The development server runs at `http://localhost:4173`.

```sh
pnpm test     # Wave stability and frame-rate-independent buoyancy checks
pnpm build    # Production assets in dist/
pnpm preview  # Serve the production build locally
```

## Deploy on Vercel

Import `hamzaaftab325-eng/Fizora` into Vercel and select the `main` branch. Use the repository root as the Root Directory. The included `vercel.json` supplies:

| Setting | Value |
| --- | --- |
| Framework | Vite |
| Install command | `pnpm install --frozen-lockfile` |
| Build command | `pnpm run build` |
| Output directory | `dist` |
| Node.js | 22.x |

No environment variables, database, API keys, or backend services are required. Once the Git integration is connected, subsequent pushes are deployed by Vercel. Navigation uses hash links, so no SPA rewrite is needed.

## Experience

- Citrus Spark, Berry Burst, and Tropical Rush chapters with synchronized backgrounds and label colors.
- Geometry-based aluminum cans with rolled rims, a pull tab, condensation, front/back inspection, and smooth scroll-driven rotations.
- A simulated liquid surface with pointer wakes and click/tap splashes, plus a buoyant can response and reactive bubbles.
- WebGL refraction with a Canvas 2D fallback that keeps calm artwork at viewport resolution and processes only active ripple areas.
- Staggered typography, responsive flavor cards, hover feedback, and an enlarged label viewer.
- Motion pause and system reduced-motion support. Decorative layers never intercept links or buttons; touch scrolling does not trigger a splash.

Images are local WebP assets with their original dimensions and transparency preserved. Google Fonts supplies the typefaces, with system fallbacks if unavailable. The application does not depend on the original hosting platform.

## Project structure

| File or directory | Purpose |
| --- | --- |
| `src/main.jsx` | React layout, controls, section state, and animation orchestration |
| `src/can-scene.js` | 3D can, materials, lighting, and resource cleanup |
| `src/can-geometry.js` | Can body and physically proportioned label UV mapping |
| `src/can-labels.js` / `src/packaging.js` | Full-wrap label artwork and packaging colors |
| `src/liquid-field.js` | Water simulation and buoyancy physics |
| `src/liquid-background.js` | GPU/software refraction, bubbles, and splash rendering |
| `src/bubbles.js` / `src/motion.js` | Product bubbles and scroll motion |
| `src/assets.js` | Flavor text, colors, and asset paths |
| `src/style.css` / `src/atmosphere.css` | Responsive styles and animation details |
| `public/images/` | All product, fruit, label, and background images |

## Product content

FIZORA is a presentation concept, not an ecommerce checkout. Nutrition, ingredients, production details, and barcode values are explicitly marked as pending in the packaging artwork. Replace those placeholders with approved product specifications before using the labels for manufacturing.

### Product rendering

The Three.js scene uses a fully modeled can with 620 instanced condensation beads,
a machined lid and pull tab, continuous front/back labels, and a procedural studio
lighting environment. Four independently moving rounded ice meshes include internal
fracture lines and trapped air pockets. Ice and water beads refract a shared scene
capture at half resolution; geometry and materials are reused between cubes.

Ice is entirely geometry and shaders. The previous photographic ice/splash overlay
has been removed, including from collection cards. Procedural SVG studio backgrounds
contain only gradients; fruit artwork remains on the labels and beside the product.
Click ripples and cube impulses share the page's animation clock. Pausing motion or
using reduced motion freezes the ambient scene. Without WebGL the page displays the
matching front/back can images and omits the 3D ice, with no fake ice-image fallback.

Validation: production build, wave/buoyancy simulation tests, geometry bounds and UV
checks. The cloud preview has WebGL disabled, so final GPU appearance must be reviewed
in a WebGL-capable browser; successful compilation is not a visual quality guarantee.
