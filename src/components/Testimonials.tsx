import { motion } from "motion/react";
import { TestimonialsColumn, type Testimonial } from "@/components/ui/testimonials-columns";

const testimonials: Testimonial[] = [
  {
    text: "Em 30 dias consegui enxergar o buraco que eu tava indo. Ajustei os gastos e sobrou R$800 no fim do mês pela primeira vez.",
    name: "Mariana S.",
    role: "Designer autônoma",
    initials: "MS",
  },
  {
    text: "A visão de 6 meses mudou tudo. Consigo planejar as parcelas do carro sem surpresa. Vale muito mais que R$300.",
    name: "Rafael T.",
    role: "Analista de TI",
    initials: "RT",
  },
  {
    text: "Comprei o vitalício e o suporte em call com o Erick foi decisivo. Ele revisou minhas planilhas comigo.",
    name: "Camila R.",
    role: "Empreendedora",
    initials: "CR",
  },
  {
    text: "Sempre usei Excel mas dava preguiça. Aqui é rápido, parece planilha mas roda no celular sem travar.",
    name: "João P.",
    role: "Motorista de app",
    initials: "JP",
  },
  {
    text: "Zerei o cartão em 4 meses seguindo a projeção. Nunca imaginei que ver o futuro faria tanta diferença.",
    name: "Beatriz L.",
    role: "Enfermeira",
    initials: "BL",
  },
  {
    text: "Uso todo domingo à noite pra revisar a semana. Virou ritual. Meu casamento agradece — parei de brigar por dinheiro.",
    name: "Diego F.",
    role: "Vendedor",
    initials: "DF",
  },
  {
    text: "O plano Starter foi meu primeiro passo. Depois de 2 meses migrei pro anual sem pensar duas vezes.",
    name: "Larissa M.",
    role: "Estudante",
    initials: "LM",
  },
  {
    text: "Sou péssimo com números. Aqui só preencho e o app calcula tudo. Consegui juntar reserva de emergência em 5 meses.",
    name: "Pedro H.",
    role: "Professor",
    initials: "PH",
  },
  {
    text: "A cara de planilha me conquistou. Odeio apps bonitinhos que escondem os dados. Aqui vejo tudo de uma vez.",
    name: "Ana C.",
    role: "Contadora",
    initials: "AC",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export function Testimonials() {
  return (
    <section id="depoimentos" className="w-full px-5 sm:px-8 py-24 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center text-center max-w-2xl mx-auto"
        >
          <span className="inline-flex items-center px-3 py-1 rounded-full border border-border bg-background text-xs font-medium text-muted-foreground">
            Depoimentos
          </span>
          <h2 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">
            Quem já usa a Planilha Futuro
          </h2>
          <p className="mt-3 text-muted-foreground">
            Milhares de pessoas organizando os próximos 6 meses da vida financeira.
          </p>
        </motion.div>

        <div className="mt-12 flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[640px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={18} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={22} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={20} />
        </div>
      </div>
    </section>
  );
}
