import Image from "next/image";

interface KasagiLogoProps {
  width?: number;
  height?: number;
}

export default function KasagiLogo({ width = 46, height = 46 }: KasagiLogoProps) {
  return <Image src="/Kasagi-logo.svg" alt="" width={width} height={height} />;
};
