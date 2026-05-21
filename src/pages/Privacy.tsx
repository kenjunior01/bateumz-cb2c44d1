import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-6 py-24">
        <h1 className="font-display text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>

        <div className="prose prose-sm dark:prose-invert max-w-3xl space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-xl font-semibold text-foreground">1. Data Collection</h2>
            <p>Bateu collects only the data strictly necessary to run the platform: name, phone number, email address, and payment information. Data is collected at registration and when entering raffles.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">2. Use of Data</h2>
            <p>Personal data is used exclusively to: manage your account and profile, process raffle entries, communicate results and notifications, and comply with legal obligations.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">3. Storage and Security</h2>
            <p>All data is stored on secure servers with end-to-end encryption. We follow industry best practices to protect our users' information.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">4. Data Sharing</h2>
            <p>We do not share, sell, or rent personal data to third parties. Data may only be shared when required by law or with the user's explicit consent.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">5. User Rights</h2>
            <p>You have the right to access, correct, update, or request the deletion of your personal data at any time, through account settings or by contacting support.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">6. Cookies</h2>
            <p>The platform uses essential cookies to operate the service and analytics cookies to improve user experience. You can disable non-essential cookies in your browser settings.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-foreground">7. Changes</h2>
            <p>This policy may be updated periodically. Users will be notified of significant changes through the platform.</p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
}
