import Header from "@/components/Header";
import Footer from "@/components/Footer";

const AffiliateDisclosure = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <h1 className="text-4xl font-bold text-foreground mb-8">Affiliate Disclosure</h1>
          <p className="text-muted-foreground mb-6">Last updated: January 4, 2026</p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Our Commitment to Transparency</h2>
              <p className="text-muted-foreground leading-relaxed">
                At GoFlyFinder, we believe in being transparent about how we operate and make money. This disclosure explains our affiliate relationships and how they may affect the content and recommendations on our platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">How We Make Money</h2>
              <p className="text-muted-foreground leading-relaxed">
                GoFlyFinder is a free service for users. We earn money through affiliate partnerships with airlines, travel agencies, and other travel-related companies. When you click on a link and make a booking through one of our partners, we may receive a commission at no additional cost to you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Affiliate Partners</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">Our affiliate partners may include:</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2">
                <li>Major airlines and low-cost carriers</li>
                <li>Online travel agencies (OTAs)</li>
                <li>Hotel booking platforms</li>
                <li>Car rental companies</li>
                <li>Travel insurance providers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Editorial Independence</h2>
              <p className="text-muted-foreground leading-relaxed">
                Our affiliate relationships do not influence our search results or recommendations. We display flights based on price, duration, and other objective criteria. Our goal is to help you find the best deals, regardless of our commission arrangements.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">No Extra Cost to You</h2>
              <p className="text-muted-foreground leading-relaxed">
                Using our affiliate links does not increase the price you pay. The price you see on GoFlyFinder is the same price you would pay if you went directly to the airline or travel agency. Our commissions come from the partners, not from you.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Supporting Our Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                By using GoFlyFinder to search and book your flights, you help support our free service. The commissions we receive allow us to continue providing flight comparison tools and travel resources at no cost to our users.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-foreground mb-4">Questions?</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about our affiliate relationships, please contact us at affiliates@goflyfinder.com.
              </p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default AffiliateDisclosure;
