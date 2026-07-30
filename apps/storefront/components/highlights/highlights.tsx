import { LinkBox } from '@/components/link-box/link-box';

/**
 * Faixa de vantagens — frete, cupom, assinatura, atendimento. Conteúdo
 * editorial curto e estável, então mora no componente e não num JSON: não há
 * arte, não há variação por campanha, e um arquivo de dados só para quatro
 * frases seria indireção sem ganho.
 *
 * É o caso mais simples do `LinkBox`: o filho é texto puro, sem imagem.
 */
const ITEMS = [
  {
    title: 'Frete grátis acima de R$ 99',
    text: 'Para todo o Brasil, sem cupom e sem pegadinha.',
    href: '/lp/frete-gratis',
  },
  {
    title: 'R$ 20 na primeira compra',
    text: 'Use PRIMEIRAPATA no carrinho e economize já.',
    href: '/lp/primeira-compra',
  },
  {
    title: 'Assine e ganhe 10%',
    text: 'A ração do seu pet chega sozinha, todo mês.',
    href: '/lp/clube-fast',
  },
  {
    title: 'Troca em até 30 dias',
    text: 'Não serviu? A gente resolve pelo próprio site.',
    href: '/institucional/trocas',
  },
];

export function Highlights() {
  return (
    <section aria-label="Vantagens de comprar na Fast Commerce" className="px-4 sm:px-6">
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map((item) => (
          <li key={item.href}>
            <LinkBox
              href={item.href}
              prefetch={false}
              className="h-full rounded-xl border border-black/10 p-4 transition-colors hover:bg-black/[0.03] dark:border-white/15 dark:hover:bg-white/[0.06]"
            >
              <h3 className="text-sm font-semibold tracking-tight text-zinc-950 group-hover:underline dark:text-zinc-50">
                {item.title}
              </h3>
              <p className="mt-1 text-sm text-zinc-600 text-pretty dark:text-zinc-400">
                {item.text}
              </p>
            </LinkBox>
          </li>
        ))}
      </ul>
    </section>
  );
}
