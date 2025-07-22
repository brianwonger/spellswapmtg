import Link from 'next/link'

export const metadata = {
  title: 'Terms of Service | SpellSwap',
  description: 'Review the terms and conditions that govern your use of SpellSwap.',
}

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 py-16 px-4 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>

      <section className="space-y-6 text-muted-foreground text-sm leading-relaxed">
        <p>
          These Terms of Service ("Terms") constitute a legally binding agreement between you
          ("User," "you," or "your") and SpellSwap ("SpellSwap," "we," "us," or "our") governing
          your access to and use of the SpellSwap marketplace web application, its related services,
          and any content made available through it (collectively, the "Service"). By creating an
          account, accessing, or using the Service, you agree to be bound by these Terms.
        </p>

        <h2 className="text-base font-semibold text-foreground">1. Eligibility</h2>
        <p>
          You must be at least 13 years of age and legally capable of entering into a binding
          contract in your jurisdiction to use the Service. By using the Service, you represent and
          warrant that you meet these requirements.
        </p>

        <h2 className="text-base font-semibold text-foreground">2. Account Registration</h2>
        <p>
          To access most features, you must create an account and provide accurate, current, and
          complete information. You are responsible for maintaining the confidentiality of your
          credentials and for all activities that occur under your account.
        </p>

        <h2 className="text-base font-semibold text-foreground">3. Marketplace Conduct</h2>
        <ul className="list-disc pl-6">
          <li>Trades and sales must involve authentic Magic: The Gathering cards.</li>
          <li>No counterfeit, stolen, or otherwise prohibited items may be listed or traded.</li>
          <li>You are solely responsible for the accuracy of listings, pricing, and item condition.</li>
          <li>Users must complete transaction reviews before initiating new marketplace actions.</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground">4. Fees & Payments</h2>
        <p>
          SpellSwap may charge fees for certain marketplace transactions. All fees will be disclosed
          prior to completion. Payments are processed by third-party providers, and you agree to be
          bound by their terms.
        </p>

        <h2 className="text-base font-semibold text-foreground">5. Content & Intellectual Property</h2>
        <p>
          All SpellSwap content, trademarks, and software are the property of SpellSwap or its
          licensors. User-generated content remains yours, but you grant SpellSwap a worldwide,
          non-exclusive, royalty-free licence to use, display, and distribute such content in
          connection with the Service.
        </p>

        <h2 className="text-base font-semibold text-foreground">6. Prohibited Activities</h2>
        <p>When using the Service, you agree not to:</p>
        <ul className="list-disc pl-6">
          <li>Violate any applicable law or regulation</li>
          <li>Post harassing, fraudulent, or misleading content</li>
          <li>Interfere with or disrupt the Service's integrity or performance</li>
          <li>Attempt to access non-public areas or systems without authorisation</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground">7. Disclaimer & Limitation of Liability</h2>
        <p>
          The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any
          kind. To the fullest extent permitted by law, SpellSwap disclaims all warranties and shall
          not be liable for any indirect, incidental, special, consequential, or punitive damages
          arising out of or related to your use of the Service.
        </p>

        <h2 className="text-base font-semibold text-foreground">8. Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without cause
          or notice, including for violations of these Terms.
        </p>

        <h2 className="text-base font-semibold text-foreground">9. Modifications to Terms</h2>
        <p>
          SpellSwap reserves the right to modify these Terms at any time. We will notify users of
          material changes through the Service or via email. Continued use of the Service after
          changes become effective constitutes acceptance of the revised Terms.
        </p>

        <h2 className="text-base font-semibold text-foreground">10. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the
          jurisdiction where SpellSwap is incorporated, without regard to conflict of law
          provisions.
        </p>

        <h2 className="text-base font-semibold text-foreground">11. Contact Information</h2>
        <p>
          For questions regarding these Terms, please contact us at{' '}
          <Link href="/support/contact" className="text-primary underline">support@spellswap.app</Link>.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
    </main>
  )
} 