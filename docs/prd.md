Product Requirements Document (PRD) 
Digital Tile Catalogue & Visualizer — Admin/Client Tool 
Status: Draft — Pending Client Input 

1. Overview
This document outlines the requirements for a digital tile catalogue and visualization tool. The platform will allow the admin (client) to showcase how different tile designs/stencils appear when applied to various layouts of a house or infrastructure (e.g., living rooms, bathrooms, kitchens, facades, flooring vs. walls, etc.).
The tool is intended as a sales/presentation aid — accessed only by the admin (client) — to help demonstrate tile options to end customers during meetings or site visits, rather than as a public-facing e-commerce catalogue.
Reference prototypes reviewed:
Prototype 1: naidu-tile-viewer.netlify.app
Prototype 2 (initial concept): figma.site prototype
Prototype 3 (likely finalized front-end direction): figma.site prototype

2. Problem Statement
The client currently lacks a digital way to demonstrate how tile designs will look in real-world spaces before purchase/installation. A visual catalogue with layout-based previews will help the client make faster, more convincing sales pitches and reduce guesswork for end customers.

3. Goals & Objectives
Provide an easy way for the admin to browse and select tiles from a catalogue.
Allow tiles to be visualized against different room/infrastructure layouts (stencils).
Support a professional, polished UI including a dark mode for category browsing.
Keep the tool restricted to admin/internal use only (not public-facing).
Build a scalable structure so more tile categories, layouts, and stencils can be added later.

4. Target Users
User
Description
Access
Admin (Client)
Uses the tool to present tile options to customers
Full access
End Customers
View demonstrations through the admin, not directly on the platform
No direct access (to be confirmed)

(To be confirmed with client — see Questionnaire, Section 8)

5. Core Features
5.1 Tile Catalogue
Grid/list view of all available tiles
Tile categorization (by size, finish, material, room type, price range, etc.)
Search and filter functionality
Tile detail view (zoom, dimensions, specifications)
5.2 Layout/Stencil Visualizer
Pre-set layout stencils (e.g., bathroom wall, kitchen floor, living room, staircase, facade)
Ability to "apply" a selected tile onto a chosen stencil/layout
Preview of tile pattern, grout lines, and scale within the layout
Option to compare multiple tiles side-by-side on the same layout
5.3 Dark Mode (Category-Based)
Dark mode toggle available specifically within the tile category browsing section
Should maintain contrast/legibility of tile images and textures in dark mode
Toggle should be persistent (remembers user's last-used mode) — to confirm scope: global dark mode vs. category-only dark mode
5.4 Admin Controls
Add/edit/remove tiles from the catalogue
Add/edit/remove layout stencils
Organize tiles into categories/collections
(Optional) Upload custom room photos for on-the-fly visualization — to confirm with client
5.5 Presentation Mode
A clean, distraction-free "client-facing display mode" for use during in-person sales pitches
Possibly full-screen/kiosk mode for tablets or in-store displays

6. Non-Functional Requirements
Access Control: Single admin login (or multiple admin logins if the client has staff) — restricted, not public
Performance: Fast image loading for high-res tile textures
Responsiveness: Should work on desktop and tablet (likely used during client-facing showroom demos)
Scalability: Structure should support adding new tile categories/layouts without major rework
