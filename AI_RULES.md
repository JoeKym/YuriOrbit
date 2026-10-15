# Tech Stack
- React with TypeScript
- React Router (routes kept in src/App.tsx)
- Tailwind CSS for styling
- shadcn/ui component library (pre-built components)
- Lucide React for icons
- Vite as build tool
- No server layer unless enabled via enable_nitro
- Source code in src folder, pages in src/pages/, components in src/components/
- Main page is src/pages/Index.tsx

# Library Usage Rules
- Use shadcn/ui components whenever possible; do not edit them directly, create new components if modifications are needed.
- Use Tailwind utility classes for layout, spacing, colors, and other design aspects.
- Use lucide-react icons for all icon needs.
- Keep routing configuration in src/App.tsx using React Router.
- Place page components under src/pages/ and reusable UI components under src/components/.
- Always import from shadcn/ui library; avoid reinventing basic UI elements.
- Use TypeScript strictly; enable strict mode.
- Do not add extra state management libraries unless necessary; prefer React Context or hooks.
- Keep file sizes small; prefer small, focused components.