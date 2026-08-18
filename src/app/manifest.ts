import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FinTrack — Personal Finance Tracker",
    short_name: "FinTrack",
    description: "Track account balances, net worth, budgets, assets, liabilities, and subscriptions.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#FAFAF9",
    theme_color: "#0F766E",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
