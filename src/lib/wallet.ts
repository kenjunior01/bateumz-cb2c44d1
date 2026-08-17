import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  total_deposited: number;
  total_withdrawn: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: string;
  amount: number;
  direction: string;
  balance_after: number;
  status: string;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  metadata?: any;
  created_at: string;
}

export interface DepositRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  receipt_url?: string;
  reference?: string;
  notes?: string;
  admin_notes?: string;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  method: string;
  destination: string;
  status: string;
  notes?: string;
  created_at: string;
}

export interface PaymentMethodItem {
  id: string;
  label: string;
  icon: string;
  color: string;
  desc: string;
  countries?: string[];  // empty = all countries
  category?: "mobile_money" | "bank" | "card" | "international" | "crypto" | "instant";
  placeholder?: string;
  instructions?: string;  // template with {amount}
  fee_percent?: number; // processing fee % (0 = free)
  processing_time?: string; // e.g. "instant", "1-3 days", "10-30 min"
}

export const PAYMENT_METHODS: PaymentMethodItem[] = [
  // === MOÇAMBIQUE ===
  { id: "mpesa", label: "M-Pesa", icon: "phone", color: "from-red-500 to-red-600", desc: "Pagamento movel M-Pesa Moçambique", countries: ["MZ"], category: "mobile_money", placeholder: "84XXXXXXX", instructions: "Abra a app M-Pesa ou marque *150#. Selecione \"Transferir Dinheiro\" e envie {amount} MZN para o numero indicado. Confirme com o seu PIN.", fee_percent: 0, processing_time: "instant" },
  { id: "emola", label: "e-Mola", icon: "phone", color: "from-orange-500 to-amber-500", desc: "Pagamento movel e-Mola (VCB)", countries: ["MZ"], category: "mobile_money", placeholder: "84XXXXXXX", instructions: "Abra a app e-Mola ou marque *898#. Selecione \"Enviar Dinheiro\" e envie {amount} MZN para o numero indicado. Confirme com o seu PIN.", fee_percent: 0, processing_time: "instant" },
  { id: "conta_movel", label: "Conta Movel", icon: "smartphone", color: "from-orange-400 to-orange-600", desc: "Conta Movel Vodacom Moçambique", countries: ["MZ"], category: "mobile_money", placeholder: "85XXXXXXX", instructions: "Abra a app Conta Movel Vodacom. Seleccione Transferir e envie {amount} MZN para o numero indicado.", fee_percent: 0, processing_time: "instant" },
  { id: "tkash", label: "Tkash", icon: "zap", color: "from-yellow-400 to-yellow-600", desc: "Tkash Moçambique", countries: ["MZ"], category: "mobile_money", placeholder: "86XXXXXXX", instructions: "Abra a app Tkash. Seleccione enviar dinheiro e transfira {amount} MZN para o numero indicado.", fee_percent: 0, processing_time: "instant" },
  { id: "mzn_bank_transfer", label: "Millennium BIM", icon: "landmark", color: "from-blue-600 to-blue-800", desc: "Transferencia bancaria Millennium BIM", countries: ["MZ"], category: "bank", placeholder: "NUAN / IBAN", instructions: "Acesse o Millennium BIM iBanking ou app. Faca transferencia para o IBAN indicado no valor de {amount} MZN. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "bci_transfer", label: "BCI", icon: "landmark", color: "from-cyan-600 to-cyan-800", desc: "Transferencia bancaria BCI", countries: ["MZ"], category: "bank", placeholder: "NUAN / IBAN", instructions: "Acesse o BCI Internet Banking. Faca transferencia para o IBAN indicado no valor de {amount} MZN. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "standard_bank_mz", label: "Standard Bank", icon: "landmark", color: "from-sky-600 to-sky-800", desc: "Transferencia bancaria Standard Bank MZ", countries: ["MZ"], category: "bank", placeholder: "NUAN / IBAN", instructions: "Acesse o Standard Bank Mozambique. Faca transferencia para o IBAN indicado no valor de {amount} MZN. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "bac_mz", label: "Banco ABC (MZ)", icon: "landmark", color: "from-red-700 to-red-900", desc: "Transferencia bancaria Banco ABC Moçambique", countries: ["MZ"], category: "bank", placeholder: "NUAN / IBAN", instructions: "Acesse o Banco ABC Internet Banking. Faca transferencia para o IBAN indicado no valor de {amount} MZN.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "sapec_mz", label: "SAPEC", icon: "smartphone", color: "from-lime-600 to-lime-800", desc: "Carteira digital SAPEC Moçambique", countries: ["MZ"], category: "mobile_money", placeholder: "84XXXXXXX", instructions: "Abra a app SAPEC. Seleccione Transferir e envie {amount} MZN para o numero indicado.", fee_percent: 0, processing_time: "instant" },
  // === ANGOLA ===
  { id: "multicaixa", label: "Multicaixa Express", icon: "smartphone", color: "from-blue-500 to-blue-700", desc: "Pagamento via Multicaixa Express Angola", countries: ["AO"], category: "mobile_money", placeholder: "Numero Multicaixa", instructions: "Abra a app Multicaixa Express. Escolha \"Pagar Servico\" ou \"Transferir\" e envie {amount} AOA para o numero indicado. Confirme com PIN.", fee_percent: 0, processing_time: "instant" },
  { id: "unitel_money", label: "Unitel Money", icon: "phone", color: "from-red-600 to-red-800", desc: "Pagamento movel Unitel Money Angola", countries: ["AO"], category: "mobile_money", placeholder: "91XXXXXXX", instructions: "Abra a app Unitel Money ou marque *400#. Escolha \"Enviar Dinheiro\" e envie {amount} AOA. Confirme com PIN.", fee_percent: 0, processing_time: "instant" },
  { id: "africell_money", label: "Africell Money", icon: "phone", color: "from-pink-600 to-pink-800", desc: "Pagamento movel Africell Money Angola", countries: ["AO"], category: "mobile_money", placeholder: "92XXXXXXX", instructions: "Abra a app Africell Money. Escolha \"Pagar / Transferir\" e envie {amount} AOA para o numero indicado.", fee_percent: 0, processing_time: "instant" },
  { id: "bai_transfer", label: "BAI", icon: "landmark", color: "from-emerald-600 to-emerald-800", desc: "Transferencia bancaria BAI Angola", countries: ["AO"], category: "bank", placeholder: "IBAN BAI", instructions: "Acesse o BAI Internet Banking. Seleccionie \"Transferencia IBAN\" e envie {amount} AOA. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "bfa_transfer", label: "BFA", icon: "landmark", color: "from-amber-600 to-amber-800", desc: "Transferencia bancaria BFA Angola", countries: ["AO"], category: "bank", placeholder: "IBAN BFA", instructions: "Acesse o BFA Net. Seleccionie \"Transferencia IBAN\" e envie {amount} AOA. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "keya_ao", label: "KESB / Keya", icon: "smartphone", color: "from-teal-500 to-teal-700", desc: "Pagamento movel KESB Angola", countries: ["AO"], category: "mobile_money", placeholder: "Numero KESB", instructions: "Abra a app KESB. Escolha Transferir e envie {amount} AOA para o numero indicado.", fee_percent: 0, processing_time: "instant" },
  // === BRASIL ===
  { id: "pix", label: "PIX", icon: "qr-code", color: "from-teal-500 to-emerald-500", desc: "PIX instantaneo (Brasil)", countries: ["BR"], category: "instant", placeholder: "CPF, email, telefone ou chave", instructions: "Abra o app do seu banco. Escolha PIX > Pagar com chave. Envie {amount} BRL para a chave indicada. Confirmacao instantanea.", fee_percent: 0, processing_time: "instant" },
  { id: "boleto", label: "Boleto", icon: "file-text", color: "from-slate-500 to-slate-700", desc: "Boleto bancario (1-3 dias uteis)", countries: ["BR"], category: "bank", placeholder: "Numero do boleto", instructions: "Apos gerar o boleto, pague em qualquer banco, loterica ou app bancario. O saldo sera creditado apos compensacao (1-3 dias uteis).", fee_percent: 0, processing_time: "1-3 days" },
  { id: "mercadopago", label: "Mercado Pago", icon: "shopping-bag", color: "from-sky-400 to-sky-600", desc: "Mercado Pago (Brasil)", countries: ["BR"], category: "international", placeholder: "email@mercadopago.com", instructions: "Abra o Mercado Pago e transfira {amount} BRL para a conta indicada. Ou use o QR Code fornecido.", fee_percent: 1.5, processing_time: "instant" },
  { id: "picpay", label: "PicPay", icon: "smartphone", color: "from-green-500 to-green-700", desc: "PicPay - Pagamento instantaneo (Brasil)", countries: ["BR"], category: "instant", placeholder: "@username ou CPF", instructions: "Abra o PicPay. Seleccionie Pagar e envie {amount} BRL para o @username indicado.", fee_percent: 0, processing_time: "instant" },
  { id: "nubank", label: "Nu Pagamentos (Nu)", icon: "smartphone", color: "from-purple-600 to-purple-800", desc: "Pagamento via Nu (Nubank)", countries: ["BR"], category: "instant", placeholder: "CPF da conta Nu", instructions: "Abra o app Nu. Seleccionie Transferir PIX e envie {amount} BRL para o CPF indicado.", fee_percent: 0, processing_time: "instant" },
  // === PORTUGAL ===
  { id: "mbway", label: "MB WAY", icon: "smartphone", color: "from-red-600 to-red-700", desc: "MB WAY - Pagamento instantaneo Portugal", countries: ["PT"], category: "instant", placeholder: "91XXXXXXX", instructions: "Abra a app MB WAY. Seleccionie \"Pagar\" > \"Com numero de telemovel\" e envie {amount} EUR para o numero indicado. Confirmacao instantanea.", fee_percent: 0, processing_time: "instant" },
  { id: "multibanco", label: "Multibanco", icon: "landmark", color: "from-blue-500 to-blue-700", desc: "Pagamento via Multibanco Portugal", countries: ["PT"], category: "bank", placeholder: "Entidade / Referencia", instructions: "Aceda a um ATM Multibanco. Seleccionie Pagamentos > Pagamento de Servicos. Introduza a Entidade e Referencia indicadas no valor de {amount} EUR.", fee_percent: 0, processing_time: "instant" },
  { id: "pt_transfer", label: "Transferencia Bancaria", icon: "landmark", color: "from-indigo-500 to-indigo-700", desc: "Transferencia bancaria (PT)", countries: ["PT"], category: "bank", placeholder: "IBAN (PT50...)", instructions: "Acesse o seu home banking. Faca transferencia para o IBAN indicado no valor de {amount} EUR. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "payshop_pt", label: "Payshop", icon: "landmark", color: "from-orange-500 to-orange-700", desc: "Pagamento via Payshop (Portugal)", countries: ["PT"], category: "instant", placeholder: "Referencia Payshop", instructions: "Dirija-se a um agente Payshop. Forneça a referencia de pagamento no valor de {amount} EUR.", fee_percent: 1.5, processing_time: "10-30 min" },
  // === ESPANHA ===
  { id: "bizum", label: "Bizum", icon: "smartphone", color: "from-blue-500 to-cyan-500", desc: "Bizum - Pagamento instantaneo (Espanha)", countries: ["ES"], category: "instant", placeholder: "Numero de telemovel", instructions: "Abra la app de su banco. Seleccione Bizum y envie {amount} EUR al numero indicado. Confirmacion instantanea.", fee_percent: 0, processing_time: "instant" },
  { id: "es_transfer", label: "Transferencia Bancaria", icon: "landmark", color: "from-red-600 to-red-800", desc: "Transferencia bancaria (Espanha)", countries: ["ES"], category: "bank", placeholder: "IBAN (ES...)", instructions: "Acceda a su banca online. Realice una transferencia para el IBAN indicado por el valor de {amount} EUR.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "paypal_es", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "PayPal (Espanha)", countries: ["ES"], category: "international", placeholder: "email@paypal.com", instructions: "Envie {amount} EUR al email PayPal indicado.", fee_percent: 2.5, processing_time: "instant" },
  // === FRANÇA ===
  { id: "carte_bancaire", label: "Carte Bancaire", icon: "credit-card", color: "from-blue-700 to-indigo-700", desc: "Carte bancaire (Carte Bleue / Visa / Mastercard)", countries: ["FR"], category: "card", placeholder: "**** **** **** 1234", instructions: "Utilisez votre carte bancaire pour payer {amount} EUR via le formulaire securise.", fee_percent: 1.5, processing_time: "instant" },
  { id: "paypal_fr", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "PayPal (France)", countries: ["FR"], category: "international", placeholder: "email@paypal.com", instructions: "Envoyez {amount} EUR au compte PayPal indique.", fee_percent: 2.5, processing_time: "instant" },
  { id: "fr_transfer", label: "Virement Bancaire", icon: "landmark", color: "from-indigo-600 to-indigo-800", desc: "Virement bancaire (France)", countries: ["FR"], category: "bank", placeholder: "IBAN (FR...)", instructions: "Accedez a votre banque en ligne. Effectuez un virement de {amount} EUR vers l'IBAN indique.", fee_percent: 0, processing_time: "1-2 hours" },
  // === REINO UNIDO ===
  { id: "faster_payments", label: "Faster Payments", icon: "zap", color: "from-purple-500 to-purple-700", desc: "Faster Payments Service (UK)", countries: ["GB"], category: "instant", placeholder: "Sort code / Account number", instructions: "Use your banking app. Select Transfer > Pay someone and send {amount} GBP to the sort code and account number indicated.", fee_percent: 0, processing_time: "instant" },
  { id: "paypal_gb", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "PayPal (United Kingdom)", countries: ["GB"], category: "international", placeholder: "email@paypal.com", instructions: "Send {amount} GBP to the indicated PayPal email.", fee_percent: 2.5, processing_time: "instant" },
  { id: "gb_transfer", label: "Bank Transfer", icon: "landmark", color: "from-blue-600 to-blue-800", desc: "Bank Transfer (UK)", countries: ["GB"], category: "bank", placeholder: "Sort code / Account number / IBAN", instructions: "Access your online banking. Make a transfer for {amount} GBP to the indicated account.", fee_percent: 0, processing_time: "1-2 hours" },
  // === ALEMANHA ===
  { id: "sofort", label: "Sofortuberweisung", icon: "zap", color: "from-orange-500 to-orange-700", desc: "Sofort Banking (Alemanha)", countries: ["DE"], category: "instant", placeholder: "Dados bancarios", instructions: "Select Sofort at checkout. Enter your banking credentials and confirm the {amount} EUR payment.", fee_percent: 0.9, processing_time: "instant" },
  { id: "paypal_de", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "PayPal (Deutschland)", countries: ["DE"], category: "international", placeholder: "email@paypal.com", instructions: "Senden Sie {amount} EUR an die angegebene PayPal-E-Mail.", fee_percent: 2.5, processing_time: "instant" },
  { id: "de_transfer", label: "Uberweisung", icon: "landmark", color: "from-yellow-600 to-yellow-800", desc: "Bankuberweisung (Deutschland)", countries: ["DE"], category: "bank", placeholder: "IBAN (DE...)", instructions: "Greifen Sie auf Ihr Online-Banking zu. Uberweisen Sie {amount} EUR auf das angegebene IBAN.", fee_percent: 0, processing_time: "1-2 hours" },
  // === ITALIA ===
  { id: "satispay", label: "Satispay", icon: "smartphone", color: "from-red-500 to-red-700", desc: "Satispay - Pagamento instantaneo (Italia)", countries: ["IT"], category: "instant", placeholder: "Numero di telefono Satispay", instructions: "Apri l'app Satispay. Seleziona Invia e invia {amount} EUR al numero indicato.", fee_percent: 0, processing_time: "instant" },
  { id: "paypal_it", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "PayPal (Italia)", countries: ["IT"], category: "international", placeholder: "email@paypal.com", instructions: "Invia {amount} EUR all'email PayPal indicata.", fee_percent: 2.5, processing_time: "instant" },
  { id: "it_transfer", label: "Bonifico Bancario", icon: "landmark", color: "from-green-600 to-green-800", desc: "Bonifico bancario (Italia)", countries: ["IT"], category: "bank", placeholder: "IBAN (IT...)", instructions: "Accedi al tuo home banking. Effettua un bonifico per {amount} EUR all'IBAN indicato.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "postepay", label: "PostePay", icon: "credit-card", color: "from-yellow-500 to-yellow-700", desc: "PostePay (Italia)", countries: ["IT"], category: "card", placeholder: "Numero PostePay", instructions: "Usa la tua carta PostePay per pagare {amount} EUR tramite il form sicuro.", fee_percent: 1, processing_time: "instant" },
  // === INDIA ===
  { id: "upi", label: "UPI", icon: "qr-code", color: "from-green-500 to-green-700", desc: "Unified Payments Interface (India)", countries: ["IN"], category: "instant", placeholder: "user@upi", instructions: "Abra qualquer app UPI (GPay, PhonePe, Paytm). Seleccionie pagar com UPI ID ou QR Code no valor de {amount} INR. Confirmacao instantanea.", fee_percent: 0, processing_time: "instant" },
  { id: "paytm", label: "Paytm", icon: "wallet", color: "from-sky-500 to-sky-700", desc: "Paytm Wallet (India)", countries: ["IN"], category: "mobile_money", placeholder: "numero Paytm", instructions: "Abra a app Paytm. Seleccionie Pay ou Transfer e envie {amount} INR para o numero/ID indicado.", fee_percent: 0, processing_time: "instant" },
  { id: "phonepe", label: "PhonePe", icon: "smartphone", color: "from-purple-500 to-purple-700", desc: "PhonePe (India)", countries: ["IN"], category: "instant", placeholder: "numero PhonePe / UPI ID", instructions: "Abra a app PhonePe. Seleccionie To Phone ou Scan QR Code. Envie {amount} INR para o UPI ID indicado.", fee_percent: 0, processing_time: "instant" },
  { id: "gpay", label: "Google Pay", icon: "wallet", color: "from-green-400 to-emerald-600", desc: "Google Pay UPI (India)", countries: ["IN"], category: "instant", placeholder: "UPI ID ou numero", instructions: "Abra o Google Pay. Seleccionie Pay to contact ou scan QR Code. Envie {amount} INR. Confirmacao instantanea.", fee_percent: 0, processing_time: "instant" },
  { id: "in_bank_transfer", label: "NEFT/IMPS", icon: "landmark", color: "from-orange-500 to-orange-700", desc: "Transferencia bancaria NEFT/IMPS (India)", countries: ["IN"], category: "bank", placeholder: "Account number / IFSC", instructions: "Acesse o seu banco online. Faca transferencia NEFT/IMPS para a conta indicada no valor de {amount} INR. Envie o comprovativo.", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "razorpay", label: "Razorpay", icon: "globe", color: "from-blue-500 to-indigo-600", desc: "Razorpay (India)", countries: ["IN"], category: "international", placeholder: "email@razorpay.com", instructions: "Abra o link de pagamento Razorpay e pague {amount} INR com qualquer metodo.", fee_percent: 2, processing_time: "instant" },
  // === USA / CANADA / INTERNACIONAL ===
  { id: "visa", label: "Visa", icon: "credit-card", color: "from-violet-500 to-purple-600", desc: "Cartao Visa de credito ou debito", category: "card", placeholder: "**** **** **** 1234", fee_percent: 2.5, processing_time: "instant" },
  { id: "mastercard", label: "Mastercard", icon: "credit-card", color: "from-blue-700 to-blue-900", desc: "Cartao Mastercard de credito ou debito", category: "card", placeholder: "**** **** **** 5678", fee_percent: 2.5, processing_time: "instant" },
  { id: "paypal", label: "PayPal", icon: "globe", color: "from-blue-600 to-blue-700", desc: "Pagamento internacional via PayPal", category: "international", placeholder: "email@paypal.com", fee_percent: 2.5, processing_time: "instant" },
  { id: "apple_pay", label: "Apple Pay", icon: "smartphone", color: "from-gray-700 to-gray-900", desc: "Apple Pay - Pagamento com Face ID / Touch ID", category: "card", placeholder: "Apple Pay", fee_percent: 2.5, processing_time: "instant" },
  { id: "google_pay_intl", label: "Google Pay", icon: "wallet", color: "from-green-400 to-emerald-600", desc: "Google Pay internacional", category: "card", placeholder: "Google Pay", fee_percent: 2.5, processing_time: "instant" },
  { id: "crypto_btc", label: "Bitcoin (BTC)", icon: "bitcoin", color: "from-amber-500 to-amber-700", desc: "Pagamento via Bitcoin", category: "crypto", placeholder: "bc1q... endereco da carteira", fee_percent: 1, processing_time: "10-60 min" },
  { id: "crypto_usdt", label: "USDT (TRC20)", icon: "bitcoin", color: "from-emerald-500 to-emerald-700", desc: "Tether USDT na rede TRC20", category: "crypto", placeholder: "T... endereco TRC20", fee_percent: 1, processing_time: "1-5 min" },
  { id: "crypto_eth", label: "Ethereum (ETH)", icon: "bitcoin", color: "from-blue-400 to-indigo-600", desc: "Pagamento via Ethereum", category: "crypto", placeholder: "0x... endereco da carteira", fee_percent: 1.5, processing_time: "2-10 min" },
  { id: "crypto_usdc", label: "USDC", icon: "bitcoin", color: "from-blue-600 to-blue-800", desc: "USD Coin (ERC20 / Solana)", category: "crypto", placeholder: "Endereco da carteira USDC", fee_percent: 1, processing_time: "1-5 min" },
  { id: "bank_transfer", label: "Transferencia Bancaria", icon: "landmark", color: "from-blue-500 to-indigo-600", desc: "Transferencia bancaria internacional (SWIFT/IBAN)", category: "bank", placeholder: "IBAN / SWIFT", fee_percent: 0, processing_time: "1-3 days" },
  { id: "western_union", label: "Western Union", icon: "globe", color: "from-yellow-500 to-yellow-700", desc: "Transferencia via Western Union", category: "international", placeholder: "MTCN / Nome do destinatario", fee_percent: 3, processing_time: "10 min - 1 hour" },
  { id: "moneygram", label: "MoneyGram", icon: "globe", color: "from-red-500 to-orange-600", desc: "Transferencia via MoneyGram", category: "international", placeholder: "Reference number / Nome", fee_percent: 3, processing_time: "10 min - 1 hour" },
];

export const WITHDRAWAL_METHODS: PaymentMethodItem[] = [
  // === MOÇAMBIQUE ===
  { id: "mpesa", label: "M-Pesa", icon: "phone", placeholder: "84XXXXXXX", countries: ["MZ"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "emola", label: "e-Mola", icon: "phone", placeholder: "84XXXXXXX", countries: ["MZ"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "conta_movel", label: "Conta Movel", icon: "smartphone", placeholder: "85XXXXXXX", countries: ["MZ"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "tkash", label: "Tkash", icon: "zap", placeholder: "86XXXXXXX", countries: ["MZ"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "sapec_mz", label: "SAPEC", icon: "smartphone", placeholder: "84XXXXXXX", countries: ["MZ"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "mzn_bank_transfer", label: "Millennium BIM", icon: "landmark", placeholder: "NUAN / IBAN", countries: ["MZ"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "bci_transfer", label: "BCI", icon: "landmark", placeholder: "NUAN / IBAN", countries: ["MZ"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "standard_bank_mz", label: "Standard Bank", icon: "landmark", placeholder: "NUAN / IBAN", countries: ["MZ"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === ANGOLA ===
  { id: "multicaixa", label: "Multicaixa Express", icon: "smartphone", placeholder: "Numero Multicaixa", countries: ["AO"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "unitel_money", label: "Unitel Money", icon: "phone", placeholder: "91XXXXXXX", countries: ["AO"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "africell_money", label: "Africell Money", icon: "phone", placeholder: "92XXXXXXX", countries: ["AO"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "bai_transfer", label: "BAI", icon: "landmark", placeholder: "IBAN BAI", countries: ["AO"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "bfa_transfer", label: "BFA", icon: "landmark", placeholder: "IBAN BFA", countries: ["AO"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === BRASIL ===
  { id: "pix", label: "PIX", icon: "qr-code", placeholder: "CPF, email, telefone ou chave", countries: ["BR"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "boleto", label: "Conta Bancaria", icon: "landmark", placeholder: "CPF / Numero da conta", countries: ["BR"], category: "bank", fee_percent: 0, processing_time: "1-3 days" },
  { id: "picpay", label: "PicPay", icon: "smartphone", placeholder: "@username ou CPF", countries: ["BR"], category: "instant", fee_percent: 0, processing_time: "instant" },
  // === PORTUGAL ===
  { id: "mbway", label: "MB WAY", icon: "smartphone", placeholder: "91XXXXXXX", countries: ["PT"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "pt_transfer", label: "Transferencia Bancaria", icon: "landmark", placeholder: "IBAN (PT50...)", countries: ["PT"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === ESPANHA ===
  { id: "bizum", label: "Bizum", icon: "smartphone", placeholder: "Numero de telemovel", countries: ["ES"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "es_transfer", label: "Transferencia Bancaria", icon: "landmark", placeholder: "IBAN (ES...)", countries: ["ES"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === FRANÇA ===
  { id: "faster_payments", label: "Virement", icon: "landmark", placeholder: "IBAN (FR...)", countries: ["FR"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === REINO UNIDO ===
  { id: "faster_payments", label: "Faster Payments", icon: "zap", placeholder: "Sort code / Account number", countries: ["GB"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "gb_transfer", label: "Bank Transfer", icon: "landmark", placeholder: "Sort code / Account / IBAN", countries: ["GB"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === ALEMANHA ===
  { id: "de_transfer", label: "Uberweisung", icon: "landmark", placeholder: "IBAN (DE...)", countries: ["DE"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === ITALIA ===
  { id: "satispay", label: "Satispay", icon: "smartphone", placeholder: "Numero Satispay", countries: ["IT"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "it_transfer", label: "Bonifico Bancario", icon: "landmark", placeholder: "IBAN (IT...)", countries: ["IT"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  { id: "postepay", label: "PostePay", icon: "credit-card", placeholder: "Numero PostePay", countries: ["IT"], category: "card", fee_percent: 1, processing_time: "instant" },
  // === INDIA ===
  { id: "upi", label: "UPI", icon: "qr-code", placeholder: "user@upi", countries: ["IN"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "paytm", label: "Paytm", icon: "wallet", placeholder: "numero Paytm", countries: ["IN"], category: "mobile_money", fee_percent: 0, processing_time: "instant" },
  { id: "phonepe", label: "PhonePe", icon: "smartphone", placeholder: "numero / UPI ID", countries: ["IN"], category: "instant", fee_percent: 0, processing_time: "instant" },
  { id: "in_bank_transfer", label: "NEFT/IMPS", icon: "landmark", placeholder: "Account number / IFSC", countries: ["IN"], category: "bank", fee_percent: 0, processing_time: "1-2 hours" },
  // === INTERNACIONAL ===
  { id: "visa", label: "Visa", icon: "credit-card", placeholder: "**** **** **** 1234", category: "card", fee_percent: 2.5, processing_time: "1-3 days" },
  { id: "mastercard", label: "Mastercard", icon: "credit-card", placeholder: "**** **** **** 5678", category: "card", fee_percent: 2.5, processing_time: "1-3 days" },
  { id: "paypal", label: "PayPal", icon: "globe", placeholder: "email@paypal.com", category: "international", fee_percent: 2.5, processing_time: "1-3 days" },
  { id: "crypto_btc", label: "Bitcoin (BTC)", icon: "bitcoin", placeholder: "bc1q... endereco", category: "crypto", fee_percent: 1, processing_time: "10-60 min" },
  { id: "crypto_usdt", label: "USDT (TRC20)", icon: "bitcoin", placeholder: "T... endereco TRC20", category: "crypto", fee_percent: 1, processing_time: "1-5 min" },
  { id: "crypto_eth", label: "Ethereum (ETH)", icon: "bitcoin", placeholder: "0x... endereco", category: "crypto", fee_percent: 1.5, processing_time: "2-10 min" },
  { id: "crypto_usdc", label: "USDC", icon: "bitcoin", placeholder: "Endereco USDC", category: "crypto", fee_percent: 1, processing_time: "1-5 min" },
  { id: "bank_transfer", label: "Transferencia Bancaria", icon: "landmark", placeholder: "IBAN / SWIFT", category: "bank", fee_percent: 0, processing_time: "1-3 days" },
  { id: "western_union", label: "Western Union", icon: "globe", placeholder: "MTCN / Nome", category: "international", fee_percent: 3, processing_time: "1-3 days" },
  { id: "moneygram", label: "MoneyGram", icon: "globe", placeholder: "Reference number / Nome", category: "international", fee_percent: 3, processing_time: "1-3 days" },
];

/** Get payment methods filtered by country code */
export function getPaymentMethodsForCountry(countryCode?: string): PaymentMethodItem[] {
  if (!countryCode) return PAYMENT_METHODS;
  return PAYMENT_METHODS.filter(m => !m.countries || m.countries.includes(countryCode));
}

/** Get withdrawal methods filtered by country code */
export function getWithdrawalMethodsForCountry(countryCode?: string): PaymentMethodItem[] {
  if (!countryCode) return WITHDRAWAL_METHODS;
  return WITHDRAWAL_METHODS.filter(m => !m.countries || m.countries.includes(countryCode));
}

/** Group payment methods by category */
export function groupMethodsByCategory(methods: PaymentMethodItem[]): Record<string, PaymentMethodItem[]> {
  const groups: Record<string, PaymentMethodItem[]> = {};
  for (const m of methods) {
    const cat = m.category || "other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(m);
  }
  return groups;
}

export const PAYMENT_CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  mobile_money: { label: "Dinheiro Movel", icon: "phone" },
  instant: { label: "Pagamento Instantaneo", icon: "zap" },
  bank: { label: "Transferencia Bancaria", icon: "landmark" },
  card: { label: "Cartao de Credito/Debito", icon: "credit-card" },
  international: { label: "Internacional", icon: "globe" },
  crypto: { label: "Criptomoedas", icon: "bitcoin" },
  other: { label: "Outros", icon: "more-horizontal" },
};

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await sb.rpc("get_or_create_wallet", { p_user_id: userId });
  if (error || !data || data.length === 0) {
    console.error("[wallet] getWallet error:", error);
    return null;
  }
  return data[0] as unknown as Wallet;
}

export async function getBalance(userId: string): Promise<number> {
  const wallet = await getWallet(userId);
  return wallet?.balance ?? 0;
}

export async function processTransaction(params: {
  userId: string;
  type: string;
  amount: number;
  direction?: string;
  referenceType?: string;
  referenceId?: string;
  description?: string;
}): Promise<{ id: string; balance_after: number; status: string } | null> {
  const { data, error } = await sb.rpc("wallet_process_transaction", {
    p_user_id: params.userId,
    p_type: params.type,
    p_amount: params.amount,
    p_direction: params.direction ?? (params.type === "deposit" || params.type === "winning" || params.type === "bet_won" || params.type === "battle_winnings" || params.type === "refund" || params.type === "bet_refunded" ? "credit" : "debit"),
    p_reference_type: params.referenceType ?? null,
    p_reference_id: params.referenceId ?? null,
    p_description: params.description ?? null,
  });
  if (error || !data || data.length === 0) {
    console.error("[wallet] processTransaction error:", error);
    return null;
  }
  return data[0] as unknown as { id: string; balance_after: number; status: string };
}

export async function getTransactions(userId: string, limit = 30): Promise<WalletTransaction[]> {
  const { data, error } = await sb
    .from("wallet_transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[wallet] getTransactions error:", error);
    return [];
  }
  return (data ?? []) as WalletTransaction[];
}

export async function createDepositRequest(userId: string, amount: number, method: string, receiptUrl?: string, reference?: string, notes?: string): Promise<DepositRequest | null> {
  const { data, error } = await sb
    .from("deposit_requests")
    .insert({
      user_id: userId,
      amount,
      method,
      receipt_url: receiptUrl ?? null,
      reference: reference ?? null,
      notes: notes ?? null,
    })
    .select()
    .single();
  if (error) {
    console.error("[wallet] createDepositRequest error:", error);
    return null;
  }
  return data as DepositRequest;
}

export async function getDepositRequests(userId: string): Promise<DepositRequest[]> {
  const { data, error } = await sb
    .from("deposit_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as DepositRequest[];
}

export async function createWithdrawalRequest(userId: string, amount: number, method: string, destination: string, notes?: string): Promise<WithdrawalRequest | null> {
  const balance = await getBalance(userId);
  if (!balance || balance < amount) return null;

  const tx = await processTransaction({
    userId,
    type: "withdrawal",
    amount,
    direction: "debit",
    description: "Pedido de levantamento via " + method,
  });
  if (!tx || tx.status === "failed") return null;

  const { data, error } = await sb
    .from("withdrawal_requests")
    .insert({
      user_id: userId,
      amount,
      method,
      destination,
      notes: notes ?? null,
      wallet_transaction_id: tx.id,
    })
    .select()
    .single();
  if (error) {
    console.error("[wallet] createWithdrawalRequest error:", error);
    return null;
  }
  return data as WithdrawalRequest;
}

export async function getWithdrawalRequests(userId: string): Promise<WithdrawalRequest[]> {
  const { data, error } = await sb
    .from("withdrawal_requests")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as WithdrawalRequest[];
}

export function formatMZN(amount: number): string {
  return new Intl.NumberFormat("pt-MZ", { style: "currency", currency: "MZN", minimumFractionDigits: 2 }).format(amount);
}
