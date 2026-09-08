export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The Studio editor renders its own full-bleed top bar, so this layout
  // intentionally does not wrap children with a global Header. Authentication
  // is enforced by middleware before we get here.
  return <>{children}</>;
}
