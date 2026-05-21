import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Terms & Conditions</h1>

        <div className="prose prose-sm dark:prose-invert max-w-3xl space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By accessing and using the Bateu platform, you accept and agree to comply with these Terms & Conditions. If you do not agree with any of the terms, you must stop using the platform immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Service Description</h2>
            <p>Bateu is a premium digital raffle platform that lets verified businesses create and manage transparent raffles, and lets users participate by purchasing digital tickets.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Eligibility</h2>
            <p>To use the platform you must be at least 18 years old and reside in one of the countries we serve (United States, Canada, Portugal, Brazil, Mozambique, Angola). The platform reserves the right to request identification documents.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Payments and Tickets</h2>
            <p>Payments are processed through PayPal (US, Canada, Portugal, Brazil) or through local methods with manual receipt confirmation where applicable (M-Pesa, e-Mola, Multicaixa, MB Way, Pix, bank transfer). Each ticket purchased is tied to a unique number and recorded immutably on the platform. Tickets are non-refundable once payment is confirmed.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. Draws and Results</h2>
            <p>Draws are conducted transparently and verifiably. Results are final and not subject to appeal. The platform uses verification systems to guarantee fair draws.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Businesses and Activation Fee</h2>
            <p>Businesses wishing to create raffles must register as a business account and are subject to an activation fee defined by the platform. All raffles go through an approval process before publication.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Liability</h2>
            <p>Bateu is not liable for technical failures of payment providers, temporary service unavailability, or actions of third parties that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">8. Contact</h2>
            <p>For questions related to these terms, contact us through the in-platform support or via the channels listed in the Help Center.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
