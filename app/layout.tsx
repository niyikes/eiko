import type { Metadata } from "next";
import localFont from 'next/font/local';
import { Pixelify_Sans, Bebas_Neue, Courier_Prime } from "next/font/google";
import "./globals.css";

const pixelify = Pixelify_Sans({
  variable: "--font-pixelify",
  subsets: ["latin"],
});

const harmond = localFont({
  src: './Fgit rm --cached components/photobooth.tsxonts/Harmond-SBC.otf',
  variable: '--font-harmond',
});



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
