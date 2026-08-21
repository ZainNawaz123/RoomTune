# RoomTune — Frontend

Interactive room acoustics simulation and optimization tool. This is the
Next.js (App Router, TypeScript, Tailwind CSS) frontend for RoomTune.

**Milestone 0** covers only the interactive room editor: an SVG top-down
room with a draggable speaker and listening position, editable room
dimensions, and object selection/inspection. No acoustic simulation,
backend, or analysis is implemented yet.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` — start the development server
- `npm run build` — production build
- `npm run start` — run the production build
- `npm run lint` — run ESLint

## Project structure

```
src/
  app/                Next.js App Router entry (layout, page, global styles)
  components/          UI components (header, canvas, controls, inspector, icons)
  hooks/useRoomState.ts   Application state (room, objects, selection)
  lib/coordinates.ts   Meter <-> pixel conversion for SVG rendering
  lib/roomModel.ts     Room/object defaults, validation, clamping
  types/room.ts         Shared domain types (Position, RoomDimensions, RoomObject)
```

All room and object positions are stored in **meters**. Pixel coordinates
only exist inside the SVG rendering layer (`lib/coordinates.ts`) and are
never part of the application state.
