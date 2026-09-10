/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ARIN_ACCOUNT_MODE?: string
  readonly VITE_ARIN_API_BASE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
