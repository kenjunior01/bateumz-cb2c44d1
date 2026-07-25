import { Helmet } from "react-helmet-async";
import WalletDashboard from "@/components/wallet/WalletDashboard";

export default function Wallet() {
  return (
    <>
      <Helmet>
        <title>Carteira | Bateu</title>
        <meta name="description" content="Gerencie seu saldo, depósitos e transações na Bateu." />
      </Helmet>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-lg px-4 pt-6">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight">
              💼 Minha Carteira
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seu saldo, depósitos e transações
            </p>
          </div>
          <WalletDashboard />
        </div>
      </div>
    </>
  );
}
