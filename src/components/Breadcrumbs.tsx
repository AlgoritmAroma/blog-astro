import Link from "next/link";

export type Crumb = {
  label: string;
  href?: string;
};

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav className="breadcrumbs" aria-label="Хлебные крошки">
      {items.map((item, i) => (
        <span key={i} className="breadcrumbs__item">
          {item.href ? <Link href={item.href}>{item.label}</Link> : <span>{item.label}</span>}
          {i < items.length - 1 && <span className="breadcrumbs__sep">/</span>}
        </span>
      ))}
    </nav>
  );
}
