import { Link } from "react-router-dom";

type BrandLogoProps = {
  to?: string;
  className?: string;
};

export default function BrandLogo({ to = "/", className = "" }: BrandLogoProps) {
  return <Link to={to} aria-label="Chanakya home" className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-transparent ${className}`}>
    <img src="/chanakya-logo-symbol.png" alt="Chanakya symbol" className="h-full w-full object-contain" />
  </Link>;
}
