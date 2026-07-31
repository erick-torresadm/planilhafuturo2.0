import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — planilhafuturo" },
      { name: "description", content: "Termos de Uso do planilhafuturo — planejamento financeiro para os próximos 12 meses." },
      { property: "og:title", content: "Termos de Uso — planilhafuturo" },
      { property: "og:description", content: "Termos e condições de uso do planilhafuturo." },
      { property: "og:url", content: "https://planilhafuturo.com.br/termos" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://planilhafuturo.com.br/termos" }],
  }),
  component: Termos,
});

function Termos() {
  const updated = "25 de julho de 2026";
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={26} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14 prose-legal">
        <h1 className="text-4xl font-display mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-10">Atualizado em {updated}</p>

        <Section title="1. Quem somos">
          O planilhafuturo é um software de planejamento financeiro pessoal operado por Erick Torres,
          disponibilizado nos domínios planilhafuturo.com.br e planilhafuturo.lovable.app. Este documento
          regula o uso do site, do aplicativo e da planilha comercializada.
        </Section>

        <Section title="2. Aceite dos termos">
          Ao criar conta, assinar um plano ou usar qualquer parte do serviço, você declara ter mais de 18 anos
          (ou estar autorizado por responsável legal) e concordar integralmente com este documento e com nossa
          <Link to="/privacidade" className="text-primary"> Política de Privacidade</Link>.
        </Section>

        <Section title="3. O que oferecemos">
          <ul>
            <li>Software online para projeção de fluxo de caixa pessoal em até 12 meses.</li>
            <li>Módulos de gastos fixos, parcelas, desejos, investimentos e produtividade.</li>
            <li>Planilha Excel/Sheets vendida em separado (produto digital único).</li>
            <li>Suporte por e-mail e, nos planos Anual e Vitalício, atendimento em call com o fundador.</li>
          </ul>
          Não somos assessoria de investimentos nem oferecemos recomendação personalizada. Tudo aqui é ferramenta
          e conteúdo educacional; a decisão financeira é sempre sua.
        </Section>

        <Section title="4. Planos e pagamento">
          <ul>
            <li><strong>Grátis</strong> — teste de 7 dias com todos os recursos, sem cartão.</li>
            <li><strong>Anual</strong> — R$ 250/ano, projeção completa e suporte em call.</li>
            <li><strong>Vitalício</strong> — R$ 450 pagamento único, acesso permanente.</li>
            <li><strong>Planilha</strong> — R$ 70, produto digital de entrega manual.</li>
          </ul>
          Pagamentos processados por provedores parceiros. Preços podem mudar; a alteração nunca afeta
          contratos vigentes.
        </Section>

        <Section title="5. Garantia de 7 dias">
          Todo plano tem 7 dias corridos de garantia incondicional a partir da compra. Basta pedir por e-mail
          para <a href="mailto:contato@planilhafuturo.com.br" className="text-primary">contato@planilhafuturo.com.br</a> —
          devolvemos 100% sem burocracia.
        </Section>

        <Section title="6. Cancelamento e renovação">
          Você pode cancelar a qualquer momento pelo painel ou por e-mail. Após o cancelamento, o acesso
          permanece ativo até o fim do período pago. Renovações anuais são avisadas com 7 dias de antecedência.
        </Section>

        <Section title="7. Uso adequado">
          Você concorda em não: (a) revender, redistribuir ou publicar o conteúdo em outra plataforma;
          (b) burlar limites técnicos ou tentar acessar dados de terceiros; (c) usar o serviço para atividades
          ilegais. O descumprimento pode causar suspensão imediata sem reembolso.
        </Section>

        <Section title="8. Propriedade intelectual">
          Todo código, marca, layout, textos, aulas e materiais são de titularidade exclusiva da operação. Você
          recebe uma licença de uso pessoal, intransferível e revogável — nada mais.
        </Section>

        <Section title="9. Limitação de responsabilidade">
          O serviço é fornecido "como está". Não garantimos ganhos, resultado financeiro ou disponibilidade
          ininterrupta. Nossa responsabilidade máxima em qualquer situação está limitada ao valor efetivamente
          pago pelo usuário nos últimos 12 meses.
        </Section>

        <Section title="10. Alterações">
          Podemos atualizar estes termos. Mudanças relevantes são comunicadas por e-mail e no site com pelo
          menos 15 dias de antecedência. O uso continuado após esse prazo implica aceite.
        </Section>

        <Section title="11. Foro e lei aplicável">
          Este contrato é regido pelas leis brasileiras. Fica eleito o foro da comarca do domicílio do usuário
          consumidor, na forma da Lei nº 8.078/1990 (CDC).
        </Section>

        <Section title="12. Contato">
          Dúvidas, reclamações ou pedidos de reembolso:{" "}
          <a href="mailto:contato@planilhafuturo.com.br" className="text-primary">contato@planilhafuturo.com.br</a>.
        </Section>
      </main>
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
