import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import FirebaseProvider from "@/components/FirebaseProvider";
import Toaster from "@/components/Toaster";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "PIXEL DIGITAL | B2B Printing Solutions",
  description: "B2B printing portal for printers and advertising agencies across India.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <Suspense fallback={null}>
            <FirebaseProvider>{children}</FirebaseProvider>
          </Suspense>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
