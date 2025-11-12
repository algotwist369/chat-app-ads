# Client Application

## Prerequisites
- Node.js 20.x LTS
- npm 10.x

## Environment
Copy `env.sample` to `.env` and adjust for your environment:

```bash
cp env.sample .env
```

| Variable | Description | Example |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Base URL for REST API requests | `https://28c.d0s369.co.in` |
| `VITE_SOCKET_BASE_URL` | Socket.IO endpoint (defaults to `VITE_API_BASE_URL`) | `https://28c.d0s369.co.in` |
| `VITE_SOCKET_TRANSPORTS` | Optional comma separated transport list | `websocket,polling` |

At runtime you can also inject `window.__API_BASE_URL__` or `window.__SOCKET_BASE_URL__` before the bundle script if your hosting requires dynamic configuration.

## Local development
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
```

The build output will be generated inside `dist/`. Deploy the contents of this folder to your static hosting provider. Ensure HTTPS is enabled so that cookies and secure transports work correctly.
