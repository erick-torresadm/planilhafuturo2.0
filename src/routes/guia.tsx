import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/guia")({
  head: () => ({
    meta: [
      { title: "Guia — Como funciona o planilhafuturo" },
      { name: "description", content: "Aprenda a usar o planilhafuturo: Hoje, Fluxo, Gastos, Parcelas, Investimentos, Desejos, Produtividade e o Assistente IA." },
      { property: "og:title", content: "Guia — Como funciona o planilhafuturo" },
      { property: "og:description", content: "Tutorial completo de como usar o planilhafuturo para enxergar seus próximos 12 meses." },
      { property: "og:url", content: "https://planilhafuturo.com.br/guia" },
      { property: "og:type", content: "article" },
    ],
    links: [{ rel: "canonical", href: "https://planilhafuturo.com.br/guia" }],
  }),
  component: Guia,
});

function Guia() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto max-w-3xl px-6 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={26} /></Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="text-4xl font-display mb-2">Como funciona o planilhafuturo</h1>
        <p className="text-sm text-muted-foreground mb-10">
          Um guia rápido para você começar e aproveitar cada tela. Em média, 10 minutos de leitura.
        </p>

        {/* Sumário */}
        <div className="rounded-2xl border border-border p-6 mb-12">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Neste guia</p>
          <ol className="space-y-1.5 text-sm">
            {[
              ["comecando", "Começando — crie sua conta"],
              ["hoje", "A tela Hoje (resumo diário)"],
              ["fluxo", "Fluxo — projeção de 12 meses"],
              ["gastos", "Gastos fixos"],
              ["parcelas", "Parcelas no cartão"],
              ["investimentos", "Investimentos"],
              ["desejos", "Desejos e metas"],
              ["produtividade", "Produtividade, foco e notas"],
              ["ia", "Assistente IA"],
              ["planos", "Planos e pagamento"],
              ["dicas", "Dicas rápidas"],
            ].map(([id, label], i) => (
              <li key={id}>
                <a href={`#${id}`} className="flex items-baseline gap-2 text-muted-foreground hover:text-primary">
                  <span className="text-mono text-xs text-primary font-mono">{i + 1}.</span>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </div>

        <Section id="comecando" title="1. Começando — crie sua conta">
          <p>
            Acesse <Link to="/auth" className="text-primary">a página de entrada</Link>, crie sua conta com
            e-mail e senha (ou continuar com Google). Você começa com <strong>7 dias grátis</strong>, com todos
            os recursos liberados e sem precisar de cartão.
          </p>
          <p>
            Na primeira vez, o app pergunta seu saldo inicial e sua renda mensal — esses dois números são a base
            de toda a projeção. Pode ajustar depois em <em>Configurações → Perfil</em>.
          </p>
        </Section>

        <Section id="hoje" title="2. A tela Hoje — seu resumo diário">
          <p>
            Ao entrar, você cai na tela <strong>Hoje</strong>. Ela mostra o <strong>saldo do dia</strong> (o que
            você tem agora + o que entra e sai hoje), o que foi lançado e atalhos para lançar uma entrada ou saída.
          </p>
          <ul>
            <li><strong>Entrada</strong>: dinheiro que entra (salário, freela, venda).</li>
            <li><strong>Saída</strong>: dinheiro que sai (conta paga, compra).</li>
            <li>Cada lançamento pode ser único ou recorrente.</li>
          </ul>
        </Section>

        <Section id="fluxo" title="3. Fluxo — a projeção de 12 meses">
          <p>
            Esta é a tela mais importante. O planilhafuturo calcula <strong>dia a dia</strong> seu saldo pelos
            próximos <strong>12 meses</strong>, somando entradas, gastos fixos, parcelas e investimentos
            programados.
          </p>
          <p>
            Use o calendário/mês para navegar e veja onde você vai chegar — o famoso "saldo projetado".
            Assim você antecipa meses apertados e decide com calma antes de assumir uma parcela.
          </p>
        </Section>

        <Section id="gastos" title="4. Gastos fixos">
          <p>
            Cadastre suas contas mensais (aluguel, mercado, internet, plano de saúde, academia...). Informe o
            <strong> valor, o dia do vencimento e a frequência</strong>. O app desconta automaticamente esses
            valores do fluxo, sem você precisar lançar todo mês.
          </p>
          <ul>
            <li>Você pode desativar um gasto fixo temporariamente sem deletar.</li>
            <li>Tipos: moradia, alimentação, transporte, saúde, lazer, assinaturas e mais.</li>
          </ul>
        </Section>

        <Section id="parcelas" title="5. Parcelas no cartão">
          <p>
            Registre compras parceladas: o app espalha o valor da parcela nos meses correspondentes da projeção,
            então você <strong>não é surpreendido pela fatura</strong>. Veja quantas parcelas faltam e o total
            comprometido.
          </p>
        </Section>

        <Section id="investimentos" title="6. Investimentos">
          <p>
            Acompanhe sua carteira: CDB, Tesouro, ações, cripto (alto risco). Registre o valor aplicado e a posição
            atual — o app usa isso no seu saldo geral. <em>Importante: o planilhafuturo é ferramenta, não
            assessoria de investimentos. As decisões são suas.</em>
          </p>
        </Section>

        <Section id="desejos" title="7. Desejos e metas">
          <p>
            Aqui você transforma desejo em plano: defina um sonho (viagem, carro, reserva de emergência), o
            valor e o prazo. O app calcula <strong>quanto guardar por mês</strong> para chegar lá — e ainda sugere
            o melhor momento, considerando seu fluxo.
          </p>
        </Section>

        <Section id="produtividade" title="8. Produtividade, foco e notas">
          <p>
            A tela <strong>Foco &amp; Notas</strong> reúne: tarefas/lembretes, timer Pomodoro, hábitos e notas.
            Perfeito para manter a constância de anotar seus gastos e seguir seu plano financeiro sem depender de
            disciplina de planilha.
          </p>
        </Section>

        <Section id="ia" title="9. Assistente IA">
          <p>
            O botão de chat (canto da tela) abre o <strong>Assistente</strong>. Com uma chave gratuita do Google
            Gemini (instruções em <em>Configurações → Assistente IA</em>), você pode:
          </p>
          <ul>
            <li>Registrar gastos falando: <em>"anota R$ 20 de lanche hoje"</em>.</li>
            <li>Perguntar sobre seu fluxo: <em>"quanto posso gastar esse mês?"</em>.</li>
            <li>Pedir análises simples dos seus números.</li>
          </ul>
        </Section>

        <Section id="planos" title="10. Planos e pagamento">
          <ul>
            <li><strong>Grátis</strong> — teste de 7 dias com todos os recursos.</li>
            <li><strong>PRO Anual</strong> — R$ 250/ano (R$ 21/mês), com parcelamento no cartão em até 12x.</li>
            <li><strong>Vitalício</strong> — R$ 450, pagamento único, acesso para sempre + call de 30 min com o fundador.</li>
          </ul>
          <p>
            Aceitamos <strong>Pix</strong> e <strong>cartão de crédito</strong> (com parcelamento e juros da
            operadora). Tudo tem <strong>7 dias de garantia incondicional</strong>: se não gostar, devolvemos 100%.
            Pague na página de checkout ou em <em>Configurações → Plano</em>.
          </p>
        </Section>

        <Section id="dicas" title="11. Dicas rápidas">
          <ul>
            <li>Comece preenchendo saldo inicial e renda — a projeção só é boa se a base for real.</li>
            <li>Cadastre gastos fixos <strong>antes</strong> de lançar compras avulsas.</li>
            <li>Olhe o fluxo dos próximos meses antes de assumir qualquer parcelamento.</li>
            <li>Use a IA para registrar rápido e manter o hábito.</li>
            <li>Seus dados ficam no seu login, com segurança de banco (RLS). Ninguém mais enxerga sua planilha.</li>
          </ul>
        </Section>

        <div className="mt-12 rounded-2xl bg-primary/5 border border-primary/20 p-6 text-center">
          <p className="text-sm font-semibold">Pronto para começar?</p>
          <p className="text-xs text-muted-foreground mt-1">7 dias grátis, sem cartão.</p>
          <Link
            to="/auth"
            className="mt-4 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:brightness-110 transition"
          >
            Criar minha conta
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-muted-foreground">
          Dúvidas? Fale com a gente em{" "}
          <a href="mailto:contato@planilhafuturo.com.br" className="text-primary">contato@planilhafuturo.com.br</a>.
        </div>
      </main>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-9 scroll-mt-20">
      <h2 className="text-2xl font-display font-semibold mb-3">{title}</h2>
      <div className="text-sm text-muted-foreground leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_strong]:text-foreground [&_em]:text-foreground [&_em]:not-italic [&_em]:bg-positive-soft [&_em]:px-1 [&_em]:rounded">
        {children}
      </div>
    </section>
  );
}
