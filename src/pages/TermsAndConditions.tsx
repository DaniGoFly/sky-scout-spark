import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsAndConditions = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">Terms and Conditions</h1>
          <p className="text-muted-foreground mb-6">Last updated: January 4, 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using GoFlyFinder, you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">2. Service Description</h2>
              <p className="text-muted-foreground leading-relaxed">
                GoFlyFinder is a flight comparison platform that allows users to search and compare flight prices from various airlines and travel agencies. We do not sell tickets directly; we redirect users to third-party providers to complete bookings.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">3. User Responsibilities</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">As a user, you agree to:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Provide accurate information when using our services</li>
                <li>Use the platform for lawful purposes only</li>
                <li>Not attempt to interfere with the platform's functionality</li>
                <li>Not use automated systems to access our services without permission</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">4. Booking and Payments</h2>
              <p className="text-muted-foreground leading-relaxed">
                All bookings are made directly with airlines or travel agencies. GoFlyFinder is not responsible for the booking process, payment handling, or any issues arising from your transaction with third-party providers.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">5. Price Accuracy</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we strive to display accurate pricing, prices are subject to change and may vary at the time of booking. The final price is determined by the airline or travel agency at checkout.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">6. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                GoFlyFinder is not liable for any direct, indirect, incidental, or consequential damages arising from your use of our services, including but not limited to flight cancellations, delays, or booking issues with third parties.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">7. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on GoFlyFinder, including logos, text, graphics, and software, is the property of GoFlyFinder and protected by intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">8. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. Continued use of our services after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">9. Contact</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms and Conditions, contact us at legal@goflyfinder.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default TermsAndConditions;
