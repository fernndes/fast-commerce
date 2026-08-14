'use client';

import { Component, type ReactNode } from 'react';

/*
 * Error boundary da casca compartilhada (header/footer vindos de `@repo/app-shell`).
 *
 * Por que existe: header e footer deixaram de ser código desta zona. O SSR deles
 * depende de carregar o hydrate module do pacote (`@repo/app-shell/hydrate`), e o
 * `AppHeader`/`AppFooter` gerado pelo `@stencil/react-output-target` é um Client
 * Component — então um erro no render (hydrate module ausente, dist não
 * compilado, versão quebrada publicada) estoura DENTRO do `layout.tsx`.
 *
 * Erro em layout raiz não é capturado por `error.tsx` do mesmo segmento: viraria
 * tela branca no site inteiro. Este boundary troca isso por uma casca mínima,
 * estática e navegável.
 *
 * O que este boundary NÃO cobre, de propósito: falha de HIDRATAÇÃO (o
 * `.esm.js` de `app-components` não carregar). Nesse caso o Declarative Shadow
 * DOM já está pintado no HTML — links funcionam, a página é navegável, só a
 * busca e o dropdown de conta não ativam. Degradação aceitável, não é erro.
 */

type Props = {
  children: ReactNode;
  fallback: ReactNode;
  /** Nome usado no log — 'header' ou 'footer'. */
  label: string;
};

type State = { failed: boolean };

export class ShellBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Ruidoso de propósito: cair no fallback é degradação silenciosa para o
    // usuário, então precisa ser barulhento para quem opera.
    console.error(`[shell] ${this.props.label} falhou, usando fallback:`, error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
