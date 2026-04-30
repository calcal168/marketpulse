# MarketPulse Expo

MarketPulse is a beginner-friendly Expo app that combines recent Yahoo News and Bloomberg headlines in one iPhone app.

## Features

- Runs in Expo Go on iPhone
- Combined Yahoo + Bloomberg feed
- Source filters: All, Yahoo, Bloomberg
- Pull-to-refresh
- In-app browser using `expo-web-browser`
- Local favorites using AsyncStorage
- Loading, empty, and error states
- Dark mode support
- Modular data providers so feeds can be swapped later

## Data source notes

- Yahoo: uses a public Yahoo News RSS endpoint configured in `src/services/feedUrls.ts`.
- Bloomberg: uses Bloomberg's public news sitemap. This app uses headline, link, and publish-date metadata only. It does not scrape Bloomberg article bodies or bypass paywalls.

If either source changes its feed URL or blocks requests, update only `src/services/feedUrls.ts` or replace the matching provider.

## Requirements

- Node.js LTS
- Expo Go installed on your iPhone
- Same Wi-Fi network for your computer and iPhone, unless you use Tunnel mode

## Run on your iPhone with Expo Go

```bash
cd MarketPulseExpo
npm install
npx expo start
```

Then:

1. Open Expo Go on your iPhone.
2. Scan the QR code shown in the terminal/browser.
3. MarketPulse opens on your phone.

If the app does not connect, restart Expo in tunnel mode:

```bash
npx expo start --tunnel
```

## Useful commands

```bash
npm install
npx expo start
npx expo start --tunnel
npx expo start --ios
npx expo start --web
npm test
```

## Project structure

```text
app/
  _layout.tsx
  index.tsx
  favorites.tsx
src/
  components/
  models/
  screens/
  services/
  store/
  theme/
```

## Milestones covered

1. Scaffold Expo app
2. Build article model and networking layer
3. Add combined headlines list
4. Add source filters
5. Add article open-in-browser flow
6. Add Favorites with local persistence
7. Add polish, loading, empty, and error states
