import "./globals.css";

export const metadata = {
  title: "마왕의 최종 방어선",
  description: "마왕이 되어 왕좌를 지켜라",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
