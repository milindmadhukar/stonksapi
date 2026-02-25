# AGENTS.md

## Project Overview

Stock viewing dashboard with independent realtime scraping via Google Finance.

## Architecture

### API (`api/`)
- **Language:** Go
- **HTTP Router:** go-chi
- **WebSockets:** Gorilla WebSocket
- **Scraping:** go-colly
- **Data Source:** Google Finance

### Dashboard (`dashboard/`)
- **Language:** TypeScript
- **Runtime/Package Manager:** Bun (always use `bun`, never `npm`/`npx`/`node`)
- **Framework:** Astro
- **Styling:** Tailwind CSS
- **PWA:** This is a Progressive Web App — always consider PWA implications when editing the frontend
- Connects to the API backend for retrieving and displaying stock data

## Development

- **Dev servers are always assumed to be running.** Never start them yourself.
- You may build and run tests if needed.
