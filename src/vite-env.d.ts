/// <reference types="vite/client" />

declare module '*.module.css' {
  const classes: { [key: string]: string }
  export default classes
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_GRE_API_BASE_URL: string
  readonly VITE_DEFAULT_BROKER: string
  readonly VITE_REFRESH_INTERVAL_OVERVIEW: string
  readonly VITE_REFRESH_INTERVAL_TIMESERIES: string
  readonly VITE_REFRESH_INTERVAL_ROLLUPS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
