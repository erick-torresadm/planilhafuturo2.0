import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/cookies")({
  head: () => ({
    meta: [
      { title: "Política de Cookies — planilhafuturo" },
      { name: "description", content: "Quais cookies usamos, por quê e como você controla." },
      { property: "og:title", content: "Política de Cookies — planilhafuturo" },
      { property: "og:description", content: "Cookies essenciais e de análise. Sem rastreadores publicitários." },
      { property: "og:url", content: "https://planilhafuturo.lovable.app/cookies" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://planilhafuturo.lovable.app/cookies" }],
  }),
  component: Cookies,
});

function Cookies() {
  const rows: Array<[string, string, string, string]> = [
    ["pf_session", "Essencial", "Mantém você logado no app.", "Sessão"],
    ["pf_consent", "Essencial", "Guarda sua escolha no banner de cookies.", "12 meses"],
    ["pf_theme", "Preferência", "Lembra dark/light mode.", "12 meses"],
    ["_pf_analytics", "Análise agregada", "Contagem anônima de páginas visitadas.", "30 dias"],
  ];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={26} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-display mb-2">Política de Cookies</h1>
        <p className="text-sm text-muted-foreground mb-10">Sem rastreadores de anúncios. Só o mínimo pra o site funcionar.</p>

        <p className="text-sm text-muted-foreground mb-6">
          Cookies são pequenos arquivos que ficam no seu navegador. Usamos alguns para manter você logado e
          medir, de forma agregada e anônima, como o site é usado. Você pode redefinir sua escolha a qualquer
          momento pelo botão abaixo.
        </p>

        <div className="overflow-x-auto rounded-2xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/40">
              <tr className="text-left">
                <th className="p-3 font-semibold">Cookie</th>
                <th className="p-3 font-semibold">Categoria</th>
                <th className="p-3 font-semibold">Finalidade</th>
                <th className="p-3 font-semibold">Duração</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r[0]} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{r[0]}</td>
                  <td className="p-3 text-muted-foreground">{r[1]}</td>
                  <td className="p-3 text-muted-foreground">{r[2]}</td>
                  <td className="p-3 text-muted-foreground">{r[3]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-10">
          <button
            onClick={() => {
              if (typeof window !== "undefined") {
                localStorage.removeItem("pf_cookie_consent");
                location.reload();
              }
            }}
            className="rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:brightness-110"
          >
            Redefinir minhas preferências
          </button>
        </div>
      </main>
    </div>
  );
}
