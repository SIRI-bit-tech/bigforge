import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Check, Clock, FileText, TrendingUp, Users, Zap } from "lucide-react"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
        <div className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1 text-sm mb-6">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
                </span>
                Trusted by 500+ construction companies
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-foreground text-balance mb-6">
                The complete platform for construction bidding
              </h1>
              <p className="text-xl text-muted-foreground text-pretty mb-8 leading-relaxed">
                Connect general contractors with qualified subcontractors. Streamline RFPs, compare bids in real-time,
                and award contracts with confidence.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button asChild size="lg" className="bg-accent hover:bg-accent-hover text-white">
                  <Link href="/register">Get Started Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/how-it-works">See How It Works</Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                No credit card required • 14-day free trial • Cancel anytime
              </p>
            </div>

            <div className="relative">
              <div className="rounded-lg border border-border bg-card p-6 shadow-xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Downtown Office Complex</span>
                    <span className="text-xs text-success bg-success/10 px-2 py-1 rounded-full">3 New Bids</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between rounded bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                          EP
                        </div>
                        <div>
                          <div className="text-sm font-medium">Contractor A</div>
                          <div className="text-xs text-muted-foreground">Electrical</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">$450,000</div>
                        <div className="text-xs text-muted-foreground">2h ago</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded bg-muted p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold">
                          PM
                        </div>
                        <div>
                          <div className="text-sm font-medium">Contractor B</div>
                          <div className="text-xs text-muted-foreground">Plumbing</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold">$380,000</div>
                        <div className="text-xs text-muted-foreground">5h ago</div>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary-hover text-white">Compare All Bids</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-b border-border py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">500+</div>
              <div className="mt-2 text-sm text-muted-foreground">Active Contractors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">2,000+</div>
              <div className="mt-2 text-sm text-muted-foreground">Subcontractors</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">$2.5B+</div>
              <div className="mt-2 text-sm text-muted-foreground">Bids Processed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-foreground">98%</div>
              <div className="mt-2 text-sm text-muted-foreground">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need to manage construction bids</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From RFP creation to contract award, BidForge streamlines every step of the bidding process
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Real-Time Bid Updates</h3>
              <p className="text-muted-foreground leading-relaxed">
                See new bids instantly as they come in. No more waiting or manual refreshes.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <FileText className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Document Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                Upload blueprints, specs, and addendums. Keep all project documents organized.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Subcontractor Network</h3>
              <p className="text-muted-foreground leading-relaxed">
                Search and invite qualified subcontractors by trade, location, and certifications.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Bid Comparison Tools</h3>
              <p className="text-muted-foreground leading-relaxed">
                Compare bids side-by-side with sortable tables and detailed breakdowns.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Deadline Tracking</h3>
              <p className="text-muted-foreground leading-relaxed">
                Automatic reminders ensure you never miss a bid deadline or project milestone.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Check className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">Contract Awards</h3>
              <p className="text-muted-foreground leading-relaxed">
                Award contracts with one click and automatically notify all bidders.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border py-24">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-foreground mb-4">Ready to streamline your bidding process?</h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join hundreds of contractors and subcontractors who trust BidForge
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" className="bg-accent hover:bg-accent-hover text-white">
              <Link href="/register">Start Free Trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">Contact Sales</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-white font-bold text-lg">
                  BF
                </div>
                <span className="text-lg font-bold">BidForge</span>
              </div>
              <p className="text-sm text-muted-foreground">The complete platform for construction bid management</p>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/how-it-works" className="hover:text-foreground">
                    How It Works
                  </Link>
                </li>
                <li>
                  <Link href="/pricing" className="hover:text-foreground">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Features
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-foreground">
                    Contact
                  </Link>
                </li>
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/#" className="hover:text-foreground">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2025 BidForge. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}
