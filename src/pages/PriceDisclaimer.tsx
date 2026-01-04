import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PriceDisclaimer = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">Price Disclaimer</h1>
          <p className="text-muted-foreground mb-6">Last updated: January 4, 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Price Display Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                GoFlyFinder displays prices sourced from airlines, travel agencies, and other booking platforms. While we strive to show the most accurate and up-to-date pricing, please be aware of the following important information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Price Fluctuations</h2>
              <p className="text-muted-foreground leading-relaxed">
                Flight prices are highly dynamic and can change multiple times per day based on demand, seat availability, and airline pricing algorithms. The price displayed on GoFlyFinder may differ from the final price at the time of booking.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Currency and Taxes</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">Please note the following about pricing:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Prices are typically displayed in USD unless otherwise specified</li>
                <li>Displayed prices may or may not include all taxes and fees</li>
                <li>Additional charges such as baggage fees, seat selection, and meals are usually not included</li>
                <li>Currency conversion rates may affect the final price in your local currency</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Third-Party Pricing</h2>
              <p className="text-muted-foreground leading-relaxed">
                GoFlyFinder aggregates prices from multiple sources. The final price and all booking terms are determined by the airline or travel agency you choose. We are not responsible for pricing errors or discrepancies on third-party websites.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Best Price Guarantee</h2>
              <p className="text-muted-foreground leading-relaxed">
                While we aim to show competitive prices, we cannot guarantee that the prices displayed are the lowest available. We recommend comparing prices across multiple platforms before booking.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Price Alerts</h2>
              <p className="text-muted-foreground leading-relaxed">
                Price alerts are provided as a courtesy and are based on the prices we detect at specific times. We cannot guarantee that you will receive an alert for every price change or that alerted prices will still be available when you check.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Promotional Prices</h2>
              <p className="text-muted-foreground leading-relaxed">
                Promotional or sale prices may be subject to additional restrictions, blackout dates, or limited availability. Always review the complete terms and conditions before completing a booking.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about pricing or notice a significant discrepancy, please contact us at pricing@goflyfinder.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default PriceDisclaimer;
