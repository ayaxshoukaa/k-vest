import type { ImgHTMLAttributes } from 'react';

type BrandMarkProps = ImgHTMLAttributes<HTMLImageElement>;

export function BrandMark(props: BrandMarkProps) {
  const src = `${import.meta.env.BASE_URL}k-vest-logo-wide.png`;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      {...props}
    />
  );
}
