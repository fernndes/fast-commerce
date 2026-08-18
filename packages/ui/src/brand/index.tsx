import { focusRing } from '../tokens';

/*
 * O logotipo. É texto, não imagem: dois pesos da mesma palavra, sem request
 * extra, sem CLS e legível por leitor de tela sem `alt`.
 *
 * O `aria-label` sobrescreve o texto visível de propósito — "fastcommerce" lido
 * como uma palavra só soa errado; o nome acessível é "Fast Commerce".
 */

export function Brand({ href = '/' }: { href?: string }) {
  return (
    <a
      href={href}
      aria-label="Fast Commerce"
      className={`flex-none text-base font-extrabold whitespace-nowrap ${focusRing}`}
    >
      fast<span className="font-normal text-[#52525b] dark:text-[#a1a1aa]">commerce</span>
    </a>
  );
}
