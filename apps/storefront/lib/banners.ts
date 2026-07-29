import bannersJSON from '@/data/banners.json';

export type Banner = {
    id: string
    title: string
    subtitle: string
    cta: string
    href: string
    image: string
    alt: string
    /**
     * Dimensões intrínsecas — usadas para reservar espaço e zerar CLS.
     * Todos os banners do hero precisam ter a MESMA proporção: a altura do
     * carrossel vem do slide renderizado, e uma proporção diferente empurra
     * o conteúdo abaixo dele.
     */
    width: number
    height: number
};

const banners: Banner[] = bannersJSON;

export function getHeroBanners() {
    return banners;
}
