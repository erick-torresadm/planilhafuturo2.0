import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import {
  BookOpen, LayoutDashboard, CalendarDays, Receipt, CreditCard,
  Wallet, TrendingUp, ListChecks, Sparkles, ShieldCheck, ArrowRight,
  Table2, Rocket, HelpCircle,
} from "lucide-react";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentação — planilhafuturo" },
      { name: "description", content: "Guia completo do planilhafuturo: dashboard, fluxo diário, gastos fixos, parcelas, desejos, investimentos e tarefas. Aprenda a planejar seus próximos 6 meses em minutos." },
      { property: "og:title", content: "Documentação — planilhafuturo" },
      { property: "og:description", content: "Guia completo do planilhafuturo: fluxo diário, gastos fixos, parcelas, desejos e mais." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocsPage,
});

const sections = [
  { id: "comecar", label: "Começar", icon: Rocket },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "fluxo", label: "Fluxo diário", icon: CalendarDays },
  { id: "gastos", label: "Gastos fixos", icon: Receipt },
  { id: "parcelas", label: "Parcelas", icon: CreditCard },
  { id: "desejos", label: "Desejos e caixinhas", icon: Wallet },
  { id: "investimentos", label: "Investimentos", icon: TrendingUp },
  { id: "tarefas", label: "Tarefas", icon: ListChecks },
  { id: "metodo", label: "O método", icon: Sparkles },
  { id: "seguranca", label: "Segurança", icon: ShieldCheck },
  { id: "faq", label: "Perguntas", icon: HelpCircle },
];

function DocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/"><Logo size={28} /></Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-foreground transition">Início</Link>
            <span className="text-foreground font-medium">Documentação</span>
          </nav>
          <Link to="/auth" className="inline-flex items-center gap-1.5 text-sm rounded-full mint-gradient px-4 py-2 font-semibold">
            Entrar <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-5 sm:px-8 py-12 lg:grid lg:grid-cols-[240px_1fr_200px] lg:gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5" /> Sumário
            </div>
            <nav className="flex flex-col gap-1 text-sm">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition">
                  <s.icon className="h-3.5 w-3.5" />
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="min-w-0">
          <div className="mb-10 pb-8 border-b border-border">
            <div className="text-xs uppercase tracking-widest text-primary mb-3">Documentação</div>
            <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
              Como usar o <span className="italic text-primary">planilhafuturo</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
              Um guia direto pra você configurar em 10 minutos e ver seus próximos 6 meses de dinheiro em um olhar.
            </p>
          </div>

          {/* Mobile TOC */}
          <details className="lg:hidden mb-8 rounded-xl border border-border bg-card p-4">
            <summary className="font-semibold cursor-pointer flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Sumário
            </summary>
            <nav className="mt-4 grid grid-cols-2 gap-2 text-sm">
              {sections.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="flex items-center gap-2 py-1.5 text-muted-foreground">
                  <s.icon className="h-3.5 w-3.5" /> {s.label}
                </a>
              ))}
            </nav>
          </details>

          <Doc id="comecar" title="Começar em 10 minutos" icon={Rocket}>
            <p>
              O planilhafuturo é um app de planejamento financeiro pessoal. Diferente de aplicativos que só mostram o que já aconteceu, aqui você projeta os próximos <strong>6 meses</strong> — e ajusta antes do problema chegar.
            </p>
            <Steps
              items={[
                { t: "Crie sua conta", d: "E-mail e senha, ou entre com Google. Sem cartão." },
                { t: "Cadastre seus gastos fixos", d: "Aluguel, internet, streaming, escola — tudo que se repete todo mês." },
                { t: "Adicione suas parcelas ativas", d: "Cartão de crédito, financiamento, empréstimo. O app distribui pelos meses automaticamente." },
                { t: "Confira o fluxo diário", d: "Você já vê o saldo previsto pra cada dia dos próximos 6 meses." },
                { t: "Ajuste até sobrar", d: "Se algum mês fecha negativo, o app mostra qual dia e por quê. Você decide o que cortar." },
              ]}
            />
          </Doc>

          <Doc id="dashboard" title="Dashboard: seu mês em um olhar" icon={LayoutDashboard}>
            <p>
              A tela inicial mostra o mês atual dividido em quatro leituras rápidas — inspirado no método das planilhas financeiras clássicas.
            </p>
            <Grid>
              <Card title="Performance (E · S · D · E · C)">
                Entradas menos Saídas menos Diário menos Economias menos gastos com Cartão. É o quanto sobra (ou falta) no mês.
              </Card>
              <Card title="Economizado">
                Barra de progresso comparando o que você guardou contra a meta ideal de 10% da renda.
              </Card>
              <Card title="Custo de vida">
                Soma automática de gastos fixos + parcelas + diário — a base do seu mês.
              </Card>
              <Card title="Diário médio">
                Quanto você pode gastar por dia sem estourar. Atualiza conforme os lançamentos.
              </Card>
            </Grid>
            <p>
              Abaixo, a lista de <strong>movimentações do mês</strong> com bolinhas coloridas por categoria (E, S, D, E, C) — pra você bater o olho e entender pra onde o dinheiro foi.
            </p>
          </Doc>

          <Doc id="fluxo" title="Fluxo diário: os próximos 6 meses" icon={CalendarDays}>
            <p>
              O coração do app. Uma tabela igual planilha, com uma linha pra cada dia dos próximos 6 meses. Em cada dia você lança entradas e saídas — o saldo se recalcula automaticamente.
            </p>
            <Grid>
              <Card title="Cabeçalho fixo">
                As colunas (Dia, Entrada, Saída, Saldo) ficam fixas no topo enquanto você rola. Você sempre sabe o que está preenchendo.
              </Card>
              <Card title="Dia de hoje destacado">
                Linha maior, borda esmeralda e botão "Hoje" pra voltar rapidinho.
              </Card>
              <Card title="Resumo do futuro">
                Cada mês mostra: saldo final previsto, menor saldo do mês e quantos dias fecham negativos.
              </Card>
              <Card title="Navegação por mês">
                Chips com Jul, Ago, Set, Out, Nov, Dez e o saldo final de cada um — pra pular direto pro mês que te interessa.
              </Card>
              <Card title="Sparkline">
                Mini gráfico da trajetória do saldo ao longo do mês. Você vê a curva subir ou descer.
              </Card>
              <Card title="Alerta de negativo">
                Linhas com saldo negativo ficam com fundo avermelhado. Impossível deixar passar.
              </Card>
            </Grid>
            <Callout>
              <strong>Dica:</strong> preencha os salários e recebimentos previstos primeiro. Depois adicione os gastos fixos e parcelas — o app cruza tudo automaticamente.
            </Callout>
          </Doc>

          <Doc id="gastos" title="Gastos fixos" icon={Receipt}>
            <p>
              Tudo que se repete todo mês em valor parecido: aluguel, condomínio, energia, água, internet, streamings, mensalidades. Cadastre uma vez e o app aplica em todos os meses.
            </p>
            <Grid>
              <Card title="Tabela estilo planilha">
                Grid com bordas sutis, cabeçalho em destaque e célula focada com ring esmeralda. Edite direto na linha, sem abrir modal.
              </Card>
              <Card title="Categorias com filtro">
                Moradia, Serviços, Assinaturas, Educação, Saúde e mais. Chips no topo mostram quantos gastos há em cada.
              </Card>
              <Card title="Ativar / desativar">
                Um toggle pra pausar um gasto sem apagar (útil pra streaming que você cancelou mas pode voltar).
              </Card>
              <Card title="KPIs no topo">
                Total ativo do mês, média por conta e maior gasto — leitura instantânea.
              </Card>
            </Grid>
          </Doc>

          <Doc id="parcelas" title="Parcelas e cartões" icon={CreditCard}>
            <p>
              Toda compra parcelada aparece nos meses corretos automaticamente. Você cadastra <em>uma vez</em> e vê o impacto nos próximos meses no fluxo diário.
            </p>
            <Steps
              items={[
                { t: "Descrição da compra", d: "Ex.: Notebook, Presente aniversário, Curso." },
                { t: "Valor total", d: "O valor cheio da compra, não da parcela." },
                { t: "Nº de parcelas", d: "Em quantas vezes foi dividido." },
                { t: "Mês da primeira parcela", d: "O app distribui as próximas automaticamente." },
                { t: "Cartão", d: "Cartão 1, 2, 3, 4 ou Outro — organize por bandeira/finalidade." },
              ]}
            />
            <Callout>
              O total mensal das parcelas entra no cálculo do custo de vida e no saldo diário — sem você precisar somar nada na mão.
            </Callout>
          </Doc>

          <Doc id="desejos" title="Desejos e caixinhas" icon={Wallet}>
            <p>
              Onde você planeja o que ainda <em>não</em> comprou. Cada desejo vira uma meta com valor, prazo e status.
            </p>
            <Grid>
              <Card title="Lista de desejos">
                Registre o que você quer: viagem, curso, celular novo, reforma. Prioridade e prazo opcionais.
              </Card>
              <Card title="Caixinhas">
                Metas financeiras com valor alvo. Você contribui todo mês e acompanha a barra de progresso.
              </Card>
              <Card title="Sem misturar com o mês">
                Desejos ficam separados do fluxo — você só transfere pro mês quando decidir comprar de verdade.
              </Card>
            </Grid>
          </Doc>

          <Doc id="investimentos" title="Investimentos e patrimônio" icon={TrendingUp}>
            <p>
              Acompanhe seu patrimônio investido: CDB, Tesouro, ações, cripto ou o que quer que você tenha. O foco aqui não é operar — é <strong>enxergar o total</strong>.
            </p>
            <Grid>
              <Card title="Cadastro simples">
                Nome do ativo, tipo, valor atual e rendimento estimado.
              </Card>
              <Card title="Patrimônio consolidado">
                Soma total no dashboard, pra você ver seu progresso mês a mês.
              </Card>
              <Card title="Reserva de emergência">
                O app calcula 6× seu custo de sobrevivência e mostra o quanto você já cobriu.
              </Card>
            </Grid>
          </Doc>

          <Doc id="tarefas" title="Tarefas e lembretes" icon={ListChecks}>
            <p>
              Lista de compromissos financeiros: pagar boleto, ligar pro banco, cancelar assinatura, renegociar dívida. Marque como feito e siga em frente.
            </p>
            <p className="text-muted-foreground text-sm">
              Disponível no plano Pro. Lembretes por e-mail chegam na semana da tarefa.
            </p>
          </Doc>

          <Doc id="metodo" title="O método por trás" icon={Sparkles}>
            <p>
              O app organiza seu dinheiro em três pilares — inspirado na filosofia de orçamento pessoal mais usada por educadores financeiros no Brasil:
            </p>
            <Grid>
              <Card title="Sobrevivência (~55%)">
                Aluguel, comida, transporte, contas essenciais. O básico pra viver.
              </Card>
              <Card title="Proteção (~25%)">
                Reserva de emergência, seguros, investimentos de segurança. Seu colchão.
              </Card>
              <Card title="Liberdade (~20%)">
                Lazer, hobbies, desejos, viagens. Onde a vida acontece.
              </Card>
            </Grid>
            <p>
              O dashboard mostra a distribuição real dos seus gastos contra esses ideais — sem julgar, só pra você enxergar onde está.
            </p>
          </Doc>

          <Doc id="seguranca" title="Segurança e dados" icon={ShieldCheck}>
            <Grid>
              <Card title="Criptografia em repouso e trânsito">
                Todos os dados trafegam em HTTPS e ficam criptografados no banco.
              </Card>
              <Card title="Isolamento por conta">
                Row-Level Security no banco garante que só você acessa seus próprios lançamentos. Nem outros usuários, nem a equipe.
              </Card>
              <Card title="Sem conexão bancária">
                Você digita — não conectamos ao seu banco. Menos risco, mais controle.
              </Card>
              <Card title="Exportação livre">
                Baixe seus dados em CSV a qualquer momento (plano Pro).
              </Card>
            </Grid>
          </Doc>

          <Doc id="faq" title="Perguntas rápidas" icon={HelpCircle}>
            <Faq
              items={[
                { q: "Posso usar de graça?", a: "Sim. O plano gratuito mostra o mês atual com fluxo diário e gastos fixos. Pro libera 6 meses de projeção, parcelas, desejos, investimentos e lembretes." },
                { q: "Funciona no celular?", a: "Foi feito com celular em mente — 80% dos usuários acessam pelo mobile. A tabela vira cartões e a navegação por mês fica em chips no topo." },
                { q: "Meus dados ficam salvos?", a: "Sim, na nuvem, criptografados. Você acessa de qualquer dispositivo entrando na sua conta." },
                { q: "Posso importar minha planilha antiga?", a: "A importação por CSV está no plano Pro. Formato simples: data, descrição, valor, tipo (entrada ou saída)." },
                { q: "Preciso saber de finanças pra usar?", a: "Não. O app foi feito justamente pra quem não gosta de planilha. Preenche nos dias, o resto o app calcula." },
                { q: "Posso cancelar quando quiser?", a: "Pode. Sem multa, sem enrolação. Seus dados ficam disponíveis pra exportar por 30 dias após o cancelamento." },
              ]}
            />
          </Doc>

          {/* CTA */}
          <div className="mt-16 rounded-2xl border border-primary/40 bg-primary/[0.04] p-8 sm:p-10 text-center" style={{ boxShadow: "var(--shadow-card)" }}>
            <div className="inline-flex items-center gap-2 chip bg-primary text-primary-foreground mb-4">
              <Table2 className="h-3.5 w-3.5" /> Comece agora
            </div>
            <h2 className="font-display text-3xl sm:text-4xl">Seus próximos 6 meses <span className="italic text-primary">te esperam.</span></h2>
            <p className="mt-3 text-muted-foreground max-w-lg mx-auto">
              Em 10 minutos você tem tudo configurado e enxerga o que vai sobrar (ou faltar) todo mês.
            </p>
            <Link to="/auth" className="mt-6 inline-flex items-center gap-2 rounded-full mint-gradient px-6 py-3 font-semibold">
              Começar grátis <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </main>

        {/* Right rail (empty on smaller screens) */}
        <aside className="hidden xl:block" />
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <Logo size={22} />
          <div>© {new Date().getFullYear()} planilhafuturo. Feito no Brasil.</div>
        </div>
      </footer>
    </div>
  );
}

/* ============ Building blocks ============ */

function Doc({ id, title, icon: Icon, children }: { id: string; title: string; icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 mb-16">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h2>
      </div>
      <div className="space-y-4 text-[15px] leading-relaxed text-muted-foreground [&_strong]:text-foreground [&_em]:text-foreground">
        {children}
      </div>
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-3 my-4">{children}</div>;
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="font-semibold text-foreground text-sm mb-1.5">{title}</div>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  );
}

function Steps({ items }: { items: { t: string; d: string }[] }) {
  return (
    <ol className="my-5 space-y-3">
      {items.map((it, i) => (
        <li key={it.t} className="flex gap-4 rounded-xl border border-border bg-card p-4">
          <div className="shrink-0 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-mono text-sm font-semibold">
            {i + 1}
          </div>
          <div>
            <div className="font-semibold text-foreground">{it.t}</div>
            <div className="text-sm text-muted-foreground mt-0.5">{it.d}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-5 rounded-xl border-l-4 border-primary bg-primary/[0.04] px-5 py-4 text-sm text-foreground">
      {children}
    </div>
  );
}

function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-border border border-border rounded-xl mt-4">
      {items.map((it) => (
        <details key={it.q} className="group px-5">
          <summary className="flex items-center justify-between py-4 cursor-pointer list-none text-foreground font-medium">
            {it.q}
            <span className="ml-4 text-muted-foreground group-open:rotate-45 transition-transform text-xl leading-none">+</span>
          </summary>
          <p className="pb-4 text-sm text-muted-foreground leading-relaxed">{it.a}</p>
        </details>
      ))}
    </div>
  );
}
