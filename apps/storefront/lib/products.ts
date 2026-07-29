import produtosJSON from '@/data/products.json';

export function getAllProducts() {
    return produtos;
}

export type Product = {
    name: string
    price: number
    sellingPrice: number
    thumb_image: string
    images: string[]
    description: string
    categories: string[]
    stock: number
    id: string
    slug: string
};

const produtos: Product[] = produtosJSON;

export function getProductBySlug(slug: string) {
    return produtos?.find(p => p?.slug === slug) ?? null;
}