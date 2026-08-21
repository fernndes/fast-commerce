import { focusRing } from '../tokens';

// O logotipo, como texto — ver ui-0001
// (adr/0001-primitivas-sem-shadow-dom-tokens-como-classes.md), §1.

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
