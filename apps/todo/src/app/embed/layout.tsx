import "../globals.css";

export const metadata = {
  title: "ACOMS Controller — Embed",
};

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 min-h-screen">
        <main className="w-full">{children}</main>
      </body>
    </html>
  );
}
