// The current Windows pnpm install does not hoist the declared Express core
// type peer. These augmentations describe only the runtime APIs used here.
declare module "express-serve-static-core" {
  interface Request {
    ip?: string;
    headers: Record<string, string | undefined>;
    path: string;
    method: string;
    params: Record<string, string>;
    cookies?: Record<string, string | undefined>;
  }
  interface Response {
    cookie(name: string, value: string, options?: Record<string, unknown>): this;
    clearCookie(name: string, options?: Record<string, unknown>): this;
  }
}
declare module "express" {
  interface Request {
    ip?: string;
    headers: Record<string, string | undefined>;
    path: string;
    method: string;
    params: Record<string, string>;
    cookies?: Record<string, string | undefined>;
  }
  interface Response {
    cookie(name: string, value: string, options?: Record<string, unknown>): this;
    clearCookie(name: string, options?: Record<string, unknown>): this;
  }
}
