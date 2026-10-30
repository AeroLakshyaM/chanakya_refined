declare module "https://deno.land/std@0.168.0/http/server.ts" {
  export function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;
}

declare module "https://esm.sh/@supabase/supabase-js@2.39.3" {
  export function createClient(...args: unknown[]): any;
}

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};
