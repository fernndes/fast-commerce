import bannersJSON from '@/data/banners.json';
import promosJSON from '@/data/promo-banners.json';

export type Banner = {
    id: string
    title: string
    subtitle: string
    cta: string
    href: string
    image: string
    alt: string
    // Dimensões intrínsecas da arte — orientam o asset, não o layout (ver `Hero`).
    width: number
    height: number
};

const banners: Banner[] = bannersJSON;

export function getHeroBanners() {
    return banners;
}

// Banner de conteúdo (fora do hero): copy inteira é opcional, de propósito.
// Ver ADR 0010 (adr/0010-navegacao-e-curadoria-editorial-fail-loud.md).
export type PromoBanner = {
    id: string
    title?: string
    subtitle?: string
    cta?: string
    href: string
    image: string
    alt: string
    /** Dimensões intrínsecas — reservam o espaço antes do byte chegar. Zero CLS. */
    width: number
    height: number
};

const promos: Record<string, PromoBanner[]> = promosJSON;

// Erro intencionalmente barulhento em seção inexistente — ver ADR 0010.
export function getPromoBanners(section: string): PromoBanner[] {
    const banners = promos[section];
    if (!banners) {
        throw new Error(
            `[banners] seção "${section}" não existe em data/promo-banners.json. ` +
            `Disponíveis: ${Object.keys(promos).join(', ')}.`,
        );
    }
    return banners;
}
