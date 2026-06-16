import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../../../Backend/src/index";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
      headers() {
        if (typeof window === "undefined") return {};
        const token = localStorage.getItem("sb-access-token");
        return token ? { Authorization: `Bearer ${token}` } : {};
      },
    }),
  ],
});
