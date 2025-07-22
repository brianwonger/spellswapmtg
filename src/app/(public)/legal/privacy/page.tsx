import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy | SpellSwap',
  description: 'Understand how SpellSwap collects, uses, and protects your information.',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-10 py-16 px-4 sm:py-24">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>

      <section className="space-y-6 text-muted-foreground text-sm leading-relaxed">
        <p>
          Welcome to SpellSwap! Your privacy is important to us. This Privacy Policy explains how we
          collect, use, disclose, and safeguard your information when you visit our marketplace web
          application (the “Service”). Please read this policy carefully. If you do not agree with
          the terms of this Privacy Policy, please do not access the Service.
        </p>

        <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
        <p>
          We collect information that you voluntarily provide to us when you register an account,
          complete a transaction, or interact with certain features of the Service. This may
          include:
        </p>
        <ul className="list-disc pl-6">
          <li>Personal identification information (e.g., name, email address, postal address)</li>
          <li>Account credentials (e.g., username, password)</li>
          <li>Payment details processed by our payment provider</li>
          <li>Trading and wish-list information you add to your profile</li>
          <li>Location data if you enable geolocation features</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground">2. How We Use Your Information</h2>
        <p>We use collected information to:</p>
        <ul className="list-disc pl-6">
          <li>Create and manage your user account</li>
          <li>Facilitate trades, purchases, and other marketplace features</li>
          <li>Improve, personalise, and expand the Service</li>
          <li>Send administrative information such as confirmations, updates, and security alerts</li>
          <li>Respond to enquiries and provide user support</li>
        </ul>

        <h2 className="text-base font-semibold text-foreground">3. Sharing of Information</h2>
        <p>
          We do not sell or rent your personal information. We may share information with trusted
          third-party vendors who perform services for us (such as payment processing), or when
          required by law.
        </p>

        <h2 className="text-base font-semibold text-foreground">4. Cookies & Tracking Technologies</h2>
        <p>
          SpellSwap uses cookies and similar technologies to recognise your browser or device, learn
          about your preferences, and improve your experience. You can disable cookies through your
          browser settings, but some features of the Service may not function properly.
        </p>

        <h2 className="text-base font-semibold text-foreground">5. Data Security</h2>
        <p>
          We implement reasonable administrative, technical, and organisational safeguards designed
          to protect your information. However, no internet transmission or storage system is
          completely secure, and we cannot guarantee absolute security.
        </p>

        <h2 className="text-base font-semibold text-foreground">6. Children’s Privacy</h2>
        <p>
          The Service is not directed to children under 13. We do not knowingly collect personal
          information from children. If we learn we have collected such information, we will delete
          it promptly.
        </p>

        <h2 className="text-base font-semibold text-foreground">7. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. The updated version will be indicated
          by an updated “Last updated” date and will be effective as soon as it is accessible.
        </p>

        <h2 className="text-base font-semibold text-foreground">8. Contact Us</h2>
        <p>
          If you have questions about this Privacy Policy, please contact us at
          {' '}<Link href="/support/contact" className="text-primary underline">support@spellswap.app</Link>.
        </p>
      </section>

      <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>
    </main>
  )
} 