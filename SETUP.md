# Simmer Down - Setup Guide

## Prerequisites

### 1. Install Node.js

Download and install Node.js 20 LTS from: https://nodejs.org

Verify installation:
```
node --version    # Should show v20.x.x
npm --version     # Should show 10.x.x
```

### 2. Install Expo CLI

```
npm install -g expo-cli eas-cli
```

---

## Supabase Setup

### 1. Create a Supabase project

- Go to https://supabase.com
- Create a new project
- Note your project URL and anon key from Settings > API

### 2. Run the database migration

In the Supabase dashboard, go to SQL Editor and run:

```
supabase/migrations/001_initial_schema.sql
```

This creates all tables, RLS policies, storage buckets, and seeds the default recipe categories.

### 3. Enable auth providers (optional)

For Google/Apple login:
- Go to Authentication > Providers in your Supabase dashboard
- Enable Google and/or Apple and add your OAuth credentials

---

## App Setup

### 1. Install dependencies

```
cd "Simmer Down"
npm install
```

### 2. Configure environment variables

Copy `.env.example` to `.env` and fill in your values:

```
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

### 3. Replace placeholder app icons

Replace these files with actual PNG images:
- `assets/icon.png` - 1024x1024 px app icon
- `assets/splash-icon.png` - 1242x2436 px splash screen
- `assets/adaptive-icon.png` - 1024x1024 px Android adaptive icon
- `assets/favicon.png` - 196x196 px web favicon
- `assets/recipe-placeholder.png` - 400x400 px recipe card placeholder

---

## Running the App

```
# Start Expo development server
npm start

# Run on iOS simulator (macOS only)
npm run ios

# Run on Android emulator
npm run android
```

To run on a physical device, install the **Expo Go** app and scan the QR code.

---

## Project Structure

```
app/
  _layout.tsx              Root layout with auth guard and font loading
  (auth)/
    login.tsx              Email/password + social sign in
    signup.tsx             Account creation
  (tabs)/
    _layout.tsx            Bottom tab bar (5 tabs)
    index.tsx              Home screen
    recipes/
      index.tsx            Recipe list with search and filters
      [id].tsx             Recipe detail with scaling
      add.tsx              Add recipe form
      edit/[id].tsx        Edit recipe form
    plan/index.tsx         Meal plan (Phase 3)
    grocery/index.tsx      Grocery list (Phase 4)
    settings/index.tsx     Settings and profile

components/
  ui/                      Design system primitives
  recipe/                  Recipe-specific components

lib/
  supabase.ts              Supabase client
  database.types.ts        TypeScript types for all tables
  theme/                   Colors, typography, spacing tokens
  hooks/                   useAuth, useRecipes, useTheme
  stores/                  Zustand stores (auth, UI)
  utils/                   Fractions, ingredient parsing

supabase/
  migrations/              SQL files to run in Supabase dashboard
```

---

## Build for Production

### iOS

```
eas build --platform ios
```

### Android

```
eas build --platform android
```

You need an EAS account (free tier available). Run `eas login` first.
Update `extra.eas.projectId` in `app.config.ts` with your EAS project ID.

---

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | Complete | Foundation, auth, recipe CRUD, design system |
| 2 | Next | URL and photo recipe import via Claude API |
| 3 | Planned | Meal planning calendar |
| 4 | Planned | Grocery list generation |
| 5 | Planned | Offline support and household sharing |
| 6 | Planned | Seasonal suggestions and polish |
