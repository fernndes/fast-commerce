import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * Um link que embrulha qualquer coisa: uma imagem, um texto, um card inteiro.
 * Você passa `href` e o filho — o filho decide a aparência, o LinkBox só cuida
 * de ser um link decente.
 *
 *   <LinkBox href="/categorias/gatos">
 *     <Image ... />
 *   </LinkBox>
 *
 * O que ele resolve, para não ser reescrito em cada banner:
 *
 * - **Âncora certa para o destino.** Rota interna vira `<Link>` (navegação
 *   client + prefetch); URL externa vira `<a>` puro, porque não há rota para
 *   prefetchar e o roteador do Next só cobraria o custo à toa.
 * - **Foco visível.** Card clicável sem `:focus-visible` é a falha de a11y mais
 *   comum em home de e-commerce — quem navega por teclado se perde na página.
 * - **`group`.** O filho reage ao hover do link inteiro (`group-hover:scale-…`)
 *   sem precisar de estado nem de `'use client'`.
 *
 * Server Component: um `<a>` no HTML servido, zero byte de JS.
 */

/** `https:`, `mailto:`, `tel:` — qualquer esquema, mais o protocol-relative. */
const isExternal = (href: string) => /^[a-z][a-z0-9+.-]*:/i.test(href) || href.startsWith('//');

type LinkBoxProps = {
  href: string;
  children: ReactNode;
  /**
   * Nome acessível do link. Só passe quando o filho NÃO tiver texto — uma
   * imagem decorativa, um ícone. Com filho textual, o `aria-label` substitui o
   * texto para o leitor de tela em vez de somar a ele.
   */
  label?: string;
  className?: string;
  /**
   * Repassado ao `<Link>`. O padrão do Next (prefetch ao entrar na viewport)
   * é ótimo para poucos links de alta intenção e péssimo para uma home cheia
   * de banners — lá vale passar `false`. Ignorado em link externo.
   */
  prefetch?: boolean;
};

export function LinkBox({ href, children, label, className = '', prefetch }: LinkBoxProps) {
  // `block` para o link virar a caixa do filho (uma âncora inline não segura
  // um card). Quem precisar de outro display compõe por fora, num wrapper.
  const classes = `group block focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`;

  if (isExternal(href)) {
    return (
      <a href={href} target="_blank" rel="noreferrer" aria-label={label} className={classes}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} prefetch={prefetch} aria-label={label} className={classes}>
      {children}
    </Link>
  );
}
