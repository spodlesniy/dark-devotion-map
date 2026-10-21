/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION: string;
  readonly VITE_APP_URL?: string;
  readonly VITE_WIKI_API_URL?: string;
  readonly VITE_AUTHOR_URL?: string;
}
