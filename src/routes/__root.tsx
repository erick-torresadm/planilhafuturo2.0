import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, useCallback, type ReactNode } from "react";
import { toast } from "sonner";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "../lib/auth-context";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-display text-primary">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">Essa rota não existe.</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
            Voltar
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tente novamente ou volte para o início.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold"
          >
            Tentar de novo
          </button>
          <a href="/" className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm">Início</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#059669" },
      { name: "apple-mobile-web-app-title", content: "planilhafuturo" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { title: "planilhafuturo — Planejamento financeiro em 6 meses, sem planilha" },
      { property: "og:title", content: "planilhafuturo — Planejamento financeiro em 6 meses, sem planilha" },
      { name: "twitter:title", content: "planilhafuturo — Planejamento financeiro em 6 meses, sem planilha" },
      { name: "description", content: "Enxergue seus próximos 6 meses de dinheiro em um olhar. Fluxo diário, gastos fixos, parcelas e desejos — feito pra brasileiro comum, não pra planilheiro." },
      { property: "og:description", content: "Enxergue seus próximos 6 meses de dinheiro em um olhar. Fluxo diário, gastos fixos, parcelas e desejos — feito pra brasileiro comum, não pra planilheiro." },
      { name: "twitter:description", content: "Enxergue seus próximos 6 meses de dinheiro em um olhar. Fluxo diário, gastos fixos, parcelas e desejos — feito pra brasileiro comum, não pra planilheiro." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a5131fd4-32e1-4b7e-87f8-98d84fe0ff06/id-preview-05dcb2c3--e4af5627-8ad9-48c6-9281-d1cad83cbd18.lovable.app-1784919172813.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a5131fd4-32e1-4b7e-87f8-98d84fe0ff06/id-preview-05dcb2c3--e4af5627-8ad9-48c6-9281-d1cad83cbd18.lovable.app-1784919172813.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "planilhafuturo" },
      { property: "og:locale", content: "pt_BR" },
      // GEO tags
      { name: "geo.region", content: "BR-SP" },
      { name: "geo.placename", content: "São Paulo" },
      { name: "geo.position", content: "-23.5505;-46.6333" },
      { name: "ICBM", content: "-23.5505, -46.6333" },
      // AI/LLM hints
      { name: "author", content: "Erick Torres" },
      { name: "publisher", content: "planilhafuturo" },
      { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
      { rel: "apple-touch-icon", href: "/pwa-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700;800&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500;600;700&family=Work+Sans:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "Organization",
              "@id": "https://planilhafuturo.lovable.app/#org",
              name: "planilhafuturo",
              url: "https://planilhafuturo.lovable.app/",
              logo: "https://planilhafuturo.lovable.app/pwa-icon.png",
              founder: { "@type": "Person", name: "Erick Torres" },
              email: "contato@planilhafuturo.com.br",
              areaServed: "BR",
              address: { "@type": "PostalAddress", addressCountry: "BR", addressRegion: "SP" },
            },
            {
              "@type": "WebSite",
              "@id": "https://planilhafuturo.lovable.app/#site",
              url: "https://planilhafuturo.lovable.app/",
              name: "planilhafuturo",
              inLanguage: "pt-BR",
              publisher: { "@id": "https://planilhafuturo.lovable.app/#org" },
            },
            {
              "@type": "SoftwareApplication",
              name: "planilhafuturo",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web, iOS, Android",
              description: "Planejamento financeiro pessoal com projeção diária de 6 meses.",
              offers: [
                { "@type": "Offer", name: "Anual", price: "250.00", priceCurrency: "BRL" },
                { "@type": "Offer", name: "Vitalício", price: "450.00", priceCurrency: "BRL" },
              ],
              aggregateRating: { "@type": "AggregateRating", ratingValue: "4.9", ratingCount: "142" },
            },
          ],
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [installEvent, setInstallEvent] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);

  // Capture beforeinstallprompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e);
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Register service worker + update detection
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !import.meta.env.PROD) return;

    let toastId: string | number | undefined;

    navigator.serviceWorker.register("/sw.js").then((reg) => {
      // Check for updates on each page load
      reg.addEventListener("updatefound", () => {
        const newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener("statechange", () => {
          if (newSW.state === "installed" && navigator.serviceWorker.controller) {
            // New version available
            toastId = toast("Nova versão disponível", {
              description: "Atualize para a versão mais recente.",
              action: {
                label: "Atualizar",
                onClick: () => {
                  newSW.postMessage({ type: "SKIP_WAITING" });
                  window.location.reload();
                },
              },
              duration: 10000,
            });
          }
        });
      });
    }).catch(() => {});

    // Reload when a waiting SW takes over
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      window.location.reload();
    });

    return () => { /* cleanup handled by navigator lifetime */ };
  }, []);

  // Handle install
  const handleInstall = useCallback(() => {
    if (!installEvent) return;
    installEvent.prompt();
    installEvent.userChoice.then(() => {
      setCanInstall(false);
      setInstallEvent(null);
    });
  }, [installEvent]);

  // Expose install handler globally so any component can trigger it (e.g. sidebar)
  useEffect(() => {
    (window as any).__installPWA = handleInstall;
    return () => { delete (window as any).__installPWA; };
  }, [handleInstall]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        {canInstall && (
          <button
            onClick={handleInstall}
            className="fixed bottom-20 right-4 z-50 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg hover:opacity-90 transition-opacity sm:bottom-4"
          >
            Instalar app
          </button>
        )}
      </AuthProvider>
    </QueryClientProvider>
  );
}
