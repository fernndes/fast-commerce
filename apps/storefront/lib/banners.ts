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
    /**
     * Dimensões intrínsecas da arte. Quem reserva o espaço no hero é a
     * proporção do container (responsiva, ver `Hero`), então esses valores
     * servem para escolher/validar o asset — a arte deve ser panorâmica e ter
     * o essencial no centro, porque no mobile as laterais são cortadas.
     */
    width: number
    height: number
};

const banners: Banner[] = bannersJSON;

export function getHeroBanners() {
    return banners;
}

/**
 * Banner de conteúdo — a peça editorial que aparece FORA do hero: atalho de
 * categoria, faixa de campanha, card de coleção.
 *
 * Difere do `Banner` do hero em dois pontos, e os dois são de propósito:
 * - a copy inteira é opcional. Um atalho de categoria é só arte + nome, e uma
 *   faixa pode já trazer o texto embutido na imagem; inventar subtítulo só
 *   para satisfazer o tipo polui os dados.
 * - a proporção NÃO precisa ser igual entre banners de seções diferentes. Só
 *   dentro da mesma seção, senão a grade fica com cards de alturas distintas.
 *
 * `alt` é o único campo textual obrigatório: toda imagem precisa de descrição.
 * Quando há copy sobreposta é ela que nomeia o link, e a imagem passa a
 * decorativa — quem decide isso é o componente, não os dados.
 */
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

/**
 * Uma seção do `data/promo-banners.json`. O erro é intencionalmente barulhento:
 * um id de seção errado é typo de quem monta a página, e falhar no build é bem
 * melhor do que uma faixa sumir silenciosamente da home em produção.
 */
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
