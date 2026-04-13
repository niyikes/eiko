import type { Metadata } from "next";
import localFont from 'next/font/local';
import { Pixelify_Sans, Bebas_Neue, Courier_Prime } from "next/font/google";
import "./globals.css";

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
});

import localFont from 'next/font/local'

const harmond = localFont({
  src: [
    {
      path: './Fonts/Harmond-SBC.otf',
      weight: '600',
      style: 'normal',
    },
    {
      path: './Fonts/Harmond-SBIC.otf',
      weight: '600',
      style: 'italic',
    },
  ],
  variable: '--font-harmond',
})



export const metadata: Metadata = {
  title: "eiko",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={` ${pixelify.variable} ${harmond.variable} bg-black`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
