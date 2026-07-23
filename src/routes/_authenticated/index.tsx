import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { selectAll } from "@/lib/db";
import { supabase } from "@/integrations/supabase/client";
import { MESES_ABREV, brl } from "@/lib/format";
import { computaMes, totalGastoFixoMensal, parcelasNoMes, type GastoFixo, type Parcela, type Lancamento } from "@/lib/finance";
import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({ meta: [{ title: "Dashboard — Planilha" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const nav = useNavigate();
  const profile = useQuery({ queryKey: ["profile"], queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    const { data } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
    return data;
  }});
  const gastos = useQuery({ queryKey: ["gastos_fixos"], queryFn: () => selectAll("gastos_fixos") });
  const parcelas = useQuery({ queryKey: ["parcelas"], queryFn: () => selectAll("parcelas") });
  const lanc = useQuery({ queryKey: ["lancamentos"], queryFn: () => selectAll("lancamentos") });
  const invest = useQuery({ queryKey: ["investimentos"], queryFn: () => selectAll("investimentos") });
  const caixinhas = useQuery({ queryKey: ["caixinhas"], queryFn: () => selectAll("caixinhas") });

  const ano = new Date().getFullYear();
  const saldoInicial = Number(profile.data?.saldo_inicial ?? 0);

  const dadosAno = useMemo(() => {
    const g = (gastos.data ?? []) as GastoFixo[];
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    const l = (lanc.data ?? []) as unknown as Lancamento[];
    let carry = saldoInicial;
    return Array.from({ length: 12 }, (_, m) => {
      const dias = computaMes(ano, m, carry, g, p, l);
      const entradas = dias.reduce((a, d) => a + d.entradaFixa + d.entradaDiaria, 0);
      const saidas = dias.reduce((a, d) => a + d.saidaFixa + d.saidaDiaria, 0);
      const liq = entradas - saidas;
      const fim = dias.length ? dias[dias.length - 1].saldo : carry;
      carry = fim;
      return { m, entradas, saidas, liq, saldoAcum: fim };
    });
  }, [gastos.data, parcelas.data, lanc.data, saldoInicial, ano]);

  const totalInvest = ((invest.data ?? []) as any[]).reduce((a, i) => a + Number(i.posicao_atual ?? 0), 0);
  const totalCaixinhas = ((caixinhas.data ?? []) as any[]).reduce((a, c) => a + Number(c.atual ?? 0), 0);
  const contaCorrente = dadosAno[new Date().getMonth()]?.saldoAcum ?? 0;

  const gastosAnuais = (gastos.data ?? []) as GastoFixo[];
  const totalMensalFixo = totalGastoFixoMensal(gastosAnuais);
  const reservaRec = totalMensalFixo * (Number(profile.data?.meses_reserva_emergencia ?? 6));
  const reservaAtual = Math.max(0, contaCorrente);
  const reservaPct = reservaRec > 0 ? Math.min(100, (reservaAtual / reservaRec) * 100) : 0;

  const hojeM = new Date().getMonth();

  const fluxo6 = useMemo(() => {
    const p = (parcelas.data ?? []) as unknown as Parcela[];
    const renda = Number(profile.data?.renda_mensal ?? 0);
    let carry = contaCorrente;
    return Array.from({ length: 6 }, (_, i) => {
      const mm = (hojeM + i) % 12;
      const yy = ano + Math.floor((hojeM + i) / 12);
      const parcMes = parcelasNoMes(p, yy, mm);
      const sobra = renda - totalMensalFixo - parcMes;
      carry += sobra;
      return { m: mm, entrada: renda, fixos: totalMensalFixo, parc: parcMes, sobra, acum: carry, status: sobra >= 0 };
    });
  }, [parcelas.data, profile.data, totalMensalFixo, hojeM, ano, contaCorrente]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Sua vida financeira no ano de {ano}</p>
      </div>

      <div className="border rounded-md overflow-x-auto">
        <table className="sheet-grid">
          <thead>
            <tr>
              <th className="sheet-th">Métrica</th>
              {dadosAno.map((d) => (
                <th key={d.m} className="sheet-th text-right cursor-pointer hover:bg-primary/80" onClick={() => nav({ to: "/app/fluxo" })}>
                  {MESES_ABREV[d.m]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr><td className="sheet-td font-semibold">Entradas</td>{dadosAno.map((d) => <td key={d.m} className="sheet-td text-right text-positive">{brl(d.entradas)}</td>)}</tr>
            <tr className="sheet-row-alt"><td className="sheet-td font-semibold">Saídas</td>{dadosAno.map((d) => <td key={d.m} className="sheet-td text-right text-negative">{brl(d.saidas)}</td>)}</tr>
            <tr><td className="sheet-td font-semibold">(=) Líquido</td>{dadosAno.map((d) => <td key={d.m} className={`sheet-td text-right ${d.liq >= 0 ? "text-positive" : "text-negative"}`}>{brl(d.liq)}</td>)}</tr>
            <tr className="sheet-row-alt"><td className="sheet-td font-semibold">Saldo Acumulado</td>{dadosAno.map((d) => <td key={d.m} className={`sheet-td text-right font-bold ${d.saldoAcum >= 0 ? "text-positive" : "text-negative"}`}>{brl(d.saldoAcum)}</td>)}</tr>
            <tr><td className="sheet-td font-semibold">+ Investimentos</td>{dadosAno.map((d) => <td key={d.m} className="sheet-td text-right">{brl(d.saldoAcum + totalInvest)}</td>)}</tr>
          </tbody>
        </table>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="border rounded-md p-4 bg-card">
          <div className="text-xs uppercase text-muted-foreground">Reserva de Emergência</div>
          <div className="text-2xl font-bold text-primary mt-1">{brl(reservaRec)}</div>
          <div className="text-xs text-muted-foreground">Meta ({profile.data?.meses_reserva_emergencia ?? 6} meses de fixos)</div>
          <Progress value={reservaPct} className="mt-2 h-2" />
          <div className="text-xs mt-1">{brl(reservaAtual)} / {brl(reservaRec)} ({reservaPct.toFixed(0)}%)</div>
        </div>
        <div className="border rounded-md p-4 bg-card">
          <div className="text-xs uppercase text-muted-foreground">Investimentos</div>
          <div className="text-2xl font-bold text-primary mt-1">{brl(totalInvest)}</div>
          <div className="text-xs text-muted-foreground">Meta renda fixa: {brl(Number(profile.data?.meta_renda_fixa ?? 0))}/mês</div>
        </div>
        <div className="border rounded-md p-4 bg-card">
          <div className="text-xs uppercase text-muted-foreground">Meu Dinheiro Está Onde?</div>
          <div className="space-y-1 mt-2 text-sm">
            <div className="flex justify-between"><span className="text-primary">● Conta</span><span>{brl(contaCorrente)}</span></div>
            <div className="flex justify-between"><span className="text-positive">● Investimentos</span><span>{brl(totalInvest)}</span></div>
            <div className="flex justify-between"><span>● Caixinhas</span><span>{brl(totalCaixinhas)}</span></div>
          </div>
        </div>
      </div>

      <div>
        <div className="text-lg font-semibold text-primary mb-2">Fluxo mensal (6 meses)</div>
        <div className="border rounded-md overflow-x-auto">
          <table className="sheet-grid">
            <thead>
              <tr>
                <th className="sheet-th">Mês</th>
                <th className="sheet-th text-right">Entrada</th>
                <th className="sheet-th text-right">Fixos</th>
                <th className="sheet-th text-right">Parcelas</th>
                <th className="sheet-th text-right">Sobra</th>
                <th className="sheet-th text-right">Saldo Acum.</th>
                <th className="sheet-th text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {fluxo6.map((f, i) => (
                <tr key={i} className={i % 2 ? "sheet-row-alt" : ""}>
                  <td className="sheet-td font-medium">{MESES_ABREV[f.m]}</td>
                  <td className="sheet-td text-right">{brl(f.entrada)}</td>
                  <td className="sheet-td text-right text-negative">{brl(f.fixos)}</td>
                  <td className="sheet-td text-right text-negative">{brl(f.parc)}</td>
                  <td className={`sheet-td text-right ${f.sobra >= 0 ? "text-positive" : "text-negative"}`}>{brl(f.sobra)}</td>
                  <td className={`sheet-td text-right font-bold ${f.acum >= 0 ? "text-positive" : "text-negative"}`}>{brl(f.acum)}</td>
                  <td className={`sheet-td text-center text-xs font-bold ${f.status ? "text-positive" : "text-negative"}`}>{f.status ? "POSITIVO" : "NEGATIVO"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
