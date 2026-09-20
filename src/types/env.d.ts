// Type-safe env vars for 1CARZ LIVE BOARD.
//
// Client (NEXT_PUBLIC_*) vars are referenced anywhere in src/. Server-only
// (Firebase Admin) vars are referenced only inside `runtime === 'nodejs'`
// API routes — referencing them on the client would throw at build time.

declare namespace NodeJS {
  interface ProcessEnv {
    // Firebase Client SDK (browser-safe — exposed to bundle)
    NEXT_PUBLIC_FIREBASE_API_KEY: string;
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: string;
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: string;
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: string;
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: string;
    NEXT_PUBLIC_FIREBASE_APP_ID: string;
    /** Optional — only set when reCAPTCHA Enterprise + App Check are enabled. */
    NEXT_PUBLIC_RECAPTCHA_SITE_KEY?: string;
    /** رقم الواتساب الخاص بالأدمن (يُستخدم في زر "تواصل عبر واتساب") */
    NEXT_PUBLIC_ADMIN_WHATSAPP?: string;

    // Firebase Admin SDK (SERVER ONLY — never expose to client)
    FIREBASE_PROJECT_ID: string;
    FIREBASE_CLIENT_EMAIL: string;
    FIREBASE_PRIVATE_KEY: string;
  }
}

// Make this file a module
export {};