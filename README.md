# Ratedly

A ratings and reviews platform for places across India (Delhi, Mumbai, Jaipur, Agra, Chennai, Kolkata, Hyderabad, Goa, and more). **Node.js** provides the HTTP API and **SQLite** stores users, items, sessions, ratings, and reviews in `ratedly.db`.

## Run

Double-click `start.bat` in this folder, then open `http://localhost:3000`. Keep the black terminal window open while using the app.

To stop a running instance, double-click `stop.bat`. It sends a graceful local shutdown request to Ratedly.

Alternatively, from this folder run `node server.js` in a terminal.

No `npm install` is needed: it uses Node 24's built-in `node:sqlite` module. The included `start.bat` points directly to the Node runtime available with Codex, so it works even when Node is not in Command Prompt's PATH.

## Assignment coverage

**Minimum requirements**
- Authentication: registration, login, logout, salted scrypt password hashes, server-side sessions.
- Items: authenticated users can add items; all users can browse items.
- Ratings/reviews: authenticated users can create, edit, or delete only their own review.
- Averages: live rating averages and review counts, computed server-side.
- Database: SQLite (`ratedly.db`) with foreign keys, validation checks, and persisted data.

**Bonus**
- Duplicate reviews are prevented at the database level via a `UNIQUE(item_id, user_id)` constraint — the UI edits an existing review instead of creating a second one, and the API rejects a duplicate insert even if the client is bypassed.
- Rating and review filtering: minimum-rating filter (including "waiting for reviews"), free-text search across name/category, and a category dropdown.
- Additional features: sort places by top rated / most reviewed / newest / A–Z; sort an item's reviews by newest, highest, or lowest rating; reviewer age shown alongside each review.
- UI: a single-file responsive design with a search/filter bar, modals for auth and item detail, and empty/loading states.

## API routes

`POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET/POST /api/items` (supports `q`, `minRating`, `category`, `sort`), `GET /api/categories`, and `GET/POST/PUT/DELETE /api/items/:id/reviews`.
