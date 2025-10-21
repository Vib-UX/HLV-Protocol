import { Buffer } from 'buffer';
globalThis.Buffer = Buffer;

import { JwtProvider, useJwtContext } from '@lit-protocol/vincent-app-sdk/react';

import { env } from '@/config/env';

import './App.css';

import { Home } from '@/pages/home';
import { Login } from '@/pages/login';

const { VITE_APP_ID } = env;

function AppContent() {
  const { authInfo } = useJwtContext();

  return authInfo ? <Home /> : <Login />;
}

function App() {
  return (
    <JwtProvider appId={VITE_APP_ID}>
      <AppContent />
    </JwtProvider>
  );
}

export default App;

