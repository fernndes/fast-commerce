// Os SVGs inline da casca, num lugar só — ver ui-0001
// (adr/0001-primitivas-sem-shadow-dom-tokens-como-classes.md), §2.

type IconProps = {
  className?: string;
};

const base = 'fill-none stroke-current [stroke-width:1.5]';

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className={`${base} ${className ?? 'h-5 w-5'}`}>
      {children}
    </svg>
  );
}

export function AccountIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="8" cy="5.5" r="2.5" />
      <path d="M3 14c0-2.5 2.2-4 5-4s5 1.5 5 4" strokeLinecap="round" />
    </Svg>
  );
}

export function CartIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2 3h1.6l1.6 7.5h7L14 5H4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="13" r="1" />
      <circle cx="11.5" cy="13" r="1" />
    </Svg>
  );
}

export function ChevronDownIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Hambúrguer e "X" no MESMO svg, alternados por CSS — ver ui-0001, §2.
export function MenuToggleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <g className="group-open/menu:hidden">
        <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
      </g>
      <g className="hidden group-open/menu:inline">
        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
      </g>
    </Svg>
  );
}
