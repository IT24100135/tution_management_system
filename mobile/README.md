# Mobile Frontend (React Native)

This app uses:

- Frontend: React Native (Expo)
- Backend: Node.js + Express.js
- Database: MongoDB

## 1) Install dependencies

```bash
cd mobile
npm install
```

## 2) Start backend first

```bash
cd ../backend
npm run dev
```

## 3) Start mobile app

```bash
cd ../mobile
npm start
```

## API base URL

The app resolves API URL from `src/config.js` in this order:

1. `EXPO_PUBLIC_API_BASE_URL` (if set)
2. Expo Go host IP (auto-detected for physical phone testing)
3. Fallbacks:
- Android Emulator -> `http://10.0.2.2:5000`
- iOS Simulator / default -> `http://localhost:5000`

For manual override, start mobile like this:

```bash
EXPO_PUBLIC_API_BASE_URL=http://192.168.1.10:5000 npm start
```
