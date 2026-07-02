import "./globals.css";

export const metadata = {
  title: "PartnerHub",
  description: "Plataforma SaaS para empresarios de multinivel"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}

