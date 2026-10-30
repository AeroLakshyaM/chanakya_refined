import { Link } from "react-router-dom";

type BrandLogoProps = {
  to?: string;
  className?: string;
};

export default function BrandLogo({ to = "/", className = "" }: BrandLogoProps) {
  return <Link to={to} aria-label="Chanakya home" className={`inline-flex shrink-0 items-center justify-center overflow-hidden bg-[#f3f0e9] ${className}`}>
    <img src="/chanakya-logo.png" alt="Chanakya — Ideas to next steps" className="h-full w-full object-contain" />
  </Link>;
}
