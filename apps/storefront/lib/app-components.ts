const DEFAULT_APP_COMPONENTS_ORIGIN =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:4300'
    : 'https://fast-commerce-app-components.vercel.app';

export function appComponentScriptSrc(path: string) {
  const origin = process.env.NEXT_PUBLIC_APP_COMPONENTS_ORIGIN ?? DEFAULT_APP_COMPONENTS_ORIGIN;

  return `${origin.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}
