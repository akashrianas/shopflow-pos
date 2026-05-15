import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Supershop POS" },
      { name: "description", content: "Premium POS & shop management system" },
      { property: "og:title", content: "Supershop POS" },
      { name: "twitter:title", content: "Supershop POS" },
      { property: "og:description", content: "Premium POS & shop management system" },
      { name: "twitter:description", content: "Premium POS & shop management system" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19816e46-7cea-4205-b1cc-f53d037e1643/id-preview-5b274c8f--8e2376a6-ec6f-454e-9fc6-8e99e96ff177.lovable.app-1778826737728.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/19816e46-7cea-4205-b1cc-f53d037e1643/id-preview-5b274c8f--8e2376a6-ec6f-454e-9fc6-8e99e96ff177.lovable.app-1778826737728.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => (
    <AuthProvider>
      <Outlet />
      <Toaster richColors position="top-right" />
    </AuthProvider>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
