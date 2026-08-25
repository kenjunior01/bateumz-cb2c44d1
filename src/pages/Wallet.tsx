import { Helmet } from "react-helmet-async";
import WalletDashboard from "@/components/wallet/WalletDashboard";
import { motion } from "framer-motion";

export default function Wallet() {
  return (
    <>
      <Helmet>
        <title>Carteira | Bateu</title>
        <meta name="description" content="Gerencie seu saldo, depósitos e transações na Bateu." />
      </Helmet>
      <motion.div
        className="min-h-screen bg-background"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mx-auto max-w-lg px-4 pt-6">
          <div className="mb-6 shadow-[0_0_10px_hsl(var(--primary)/0.1)] rounded-lg p-3">
            <h1 className="text-2xl font-extrabold tracking-tight">
              💼 Minha Carteira
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie seu saldo, depósitos e transações
            </p>
          </div>
          <WalletDashboard />
        </div>
      </motion.div>
    </>
  );
}
