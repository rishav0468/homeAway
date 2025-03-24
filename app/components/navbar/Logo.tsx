"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";

const Logo = () => {
  const router = useRouter();

  return (
    <Image
    onClick={() => router.push('/')}
      alt="Logo"
      className="hidden md:block cursor-pointer"
      height={75}
      width={85}
      src="/images/newlogo.png"
    />
  )
}

export default Logo;