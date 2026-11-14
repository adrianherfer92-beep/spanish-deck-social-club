export function PaymentTestModeBanner() {
  const token = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;
  if (token?.startsWith("pk_live_")) return null;
  return <div role="status" className="border-b border-accent/50 bg-secondary px-4 py-2 text-center text-sm text-foreground">{token?.startsWith("pk_test_") ? "Pagos de prueba: no se cobra dinero real." : "Los cobros reales aún no están activados."}</div>;
}