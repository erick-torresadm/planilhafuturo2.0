import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade — planilhafuturo" },
      { name: "description", content: "Como o planilhafuturo coleta, usa e protege seus dados pessoais, em conformidade com a LGPD." },
      { property: "og:title", content: "Política de Privacidade — planilhafuturo" },
      { property: "og:description", content: "Conformidade com a LGPD. Seus dados, criptografados e nunca vendidos." },
      { property: "og:url", content: "https://planilhafuturo.lovable.app/privacidade" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://planilhafuturo.lovable.app/privacidade" }],
  }),
  component: Privacidade,
});

function Privacidade() {
  const updated = "25 de julho de 2026";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={26} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-display mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-10">Atualizado em {updated} · Conformidade com a LGPD (Lei 13.709/2018)</p>

        <Card title="Em uma frase">
          Seus dados são seus. A gente só usa o mínimo pra você acessar o app, e nunca vendemos nada.
        </Card>

        <Section title="1. Quem é o controlador">
          Erick Torres, responsável pela operação do planilhafuturo. Contato do encarregado (DPO):{" "}
          <a href="mailto:dpo@planilhafuturo.com.br" className="text-primary">dpo@planilhafuturo.com.br</a>.
        </Section>

        <Section title="2. Dados que coletamos">
          <ul>
            <li><strong>Cadastro:</strong> nome, e-mail e senha (com hash bcrypt).</li>
            <li><strong>Financeiros do app:</strong> entradas, saídas, parcelas, metas — apenas os valores que você digita.</li>
            <li><strong>Pagamento:</strong> processado pelos provedores parceiros; não armazenamos dados de cartão.</li>
            <li><strong>Uso:</strong> logs anônimos de erro e páginas visitadas, para melhorar o produto.</li>
          </ul>
          Nunca acessamos seu banco, nunca pedimos dados de terceiros e não usamos rastreadores publicitários.
        </Section>

        <Section title="3. Base legal e finalidade">
          Tratamos dados com base em execução de contrato (art. 7º, V da LGPD) e legítimo interesse
          (art. 7º, IX) para prevenção de fraude. Finalidades: prestar o serviço, cobrar assinaturas, enviar
          comunicados operacionais e atender pedidos legais.
        </Section>

        <Section title="4. Compartilhamento">
          Compartilhamos apenas o estritamente necessário com operadores:
          <ul>
            <li>Provedor de infraestrutura (Lovable Cloud / Supabase) — hospedagem e banco.</li>
            <li>Provedores de pagamento — para cobrança das assinaturas.</li>
            <li>E-mail transacional — envio de confirmações e recibos.</li>
          </ul>
          Nunca vendemos, alugamos ou trocamos seus dados com terceiros para publicidade.
        </Section>

        <Section title="5. Segurança">
          <ul>
            <li>Criptografia TLS 1.3 em todo tráfego.</li>
            <li>Senhas com hash bcrypt (nunca em texto claro).</li>
            <li>Row-Level Security no banco: cada usuário só enxerga a própria linha.</li>
            <li>Backups diários criptografados com retenção de 30 dias.</li>
            <li>Monitoramento contínuo de vulnerabilidades.</li>
          </ul>
        </Section>

        <Section title="6. Seus direitos (art. 18 da LGPD)">
          Você pode a qualquer momento pedir: confirmação de tratamento, acesso, correção, anonimização,
          portabilidade, eliminação, informação sobre compartilhamentos e revogação de consentimento. Basta
          escrever para <a href="mailto:dpo@planilhafuturo.com.br" className="text-primary">dpo@planilhafuturo.com.br</a> —
          respondemos em até 15 dias.
        </Section>

        <Section title="7. Retenção">
          Dados de conta são mantidos enquanto durar a assinatura e por até 30 dias após cancelamento para
          permitir reativação. Dados financeiros são deletados em definitivo nesse prazo, salvo obrigações
          legais (ex.: notas fiscais retidas por 5 anos).
        </Section>

        <Section title="8. Cookies">
          Usamos poucos cookies e todos essenciais ou de análise agregada. Detalhes na{" "}
          <Link to="/cookies" className="text-primary">Política de Cookies</Link>. Você pode gerenciá-los pelo
          banner que aparece na primeira visita.
        </Section>

        <Section title="9. Menores">
          O serviço não é destinado a menores de 18 anos. Se identificarmos cadastro de menor sem autorização,
          removemos imediatamente.
        </Section>

        <Section title="10. Transferência internacional">
          Alguns operadores podem processar dados fora do Brasil (EUA/UE). Nesses casos há cláusulas contratuais
          que garantem nível equivalente de proteção, conforme art. 33 da LGPD.
        </Section>

        <Section title="11. Alterações">
          Mudanças relevantes são avisadas por e-mail com 15 dias de antecedência. Data da última atualização
          no topo desta página.
        </Section>

        <Section title="12. ANPD">
          Você pode ainda reclamar diretamente à Autoridade Nacional de Proteção de Dados —{" "}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noreferrer" className="text-primary">gov.br/anpd</a>.
        </Section>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 mb-10">
      <div className="text-xs font-mono uppercase tracking-widest text-primary mb-2">{title}</div>
      <div className="text-lg">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-foreground">
        {children}
      </div>
    </section>
  );
}
