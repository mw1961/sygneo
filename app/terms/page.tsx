export const metadata = {
  title: 'Terms of Use & Privacy Policy — Sygneo',
  description: 'Terms of use, shipping policy, and privacy policy for Sygneo Heritage Seal.',
};

const S = {
  page:    { maxWidth: 720, margin: '0 auto', padding: '64px 32px', fontFamily: 'Georgia, serif', color: '#1C1A17', lineHeight: 1.8 } as React.CSSProperties,
  h1:      { fontSize: 28, fontWeight: 300, letterSpacing: '0.4em', marginBottom: 8 } as React.CSSProperties,
  sub:     { fontSize: 11, letterSpacing: '0.25em', color: '#8B7355', textTransform: 'uppercase' as const, fontFamily: 'Helvetica, Arial, sans-serif', marginBottom: 56 },
  h2:      { fontSize: 16, fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' as const, fontFamily: 'Helvetica, Arial, sans-serif', color: '#8B7355', marginTop: 48, marginBottom: 12 },
  p:       { fontSize: 14, color: '#4A4540', marginBottom: 14 } as React.CSSProperties,
  li:      { fontSize: 14, color: '#4A4540', marginBottom: 8 } as React.CSSProperties,
  divider: { height: 1, background: '#DDD8D0', margin: '40px 0' } as React.CSSProperties,
  updated: { fontSize: 11, color: '#B0A898', fontFamily: 'Helvetica, Arial, sans-serif', marginTop: 64 } as React.CSSProperties,
};

export default function TermsPage() {
  return (
    <main style={{ background: '#F8F5F0', minHeight: '100vh' }}>
      <div style={S.page}>
        <a href="/" aria-label="Back to Sygneo" style={{ fontSize: 11, letterSpacing: '0.2em', color: '#8B7355', textDecoration: 'none', fontFamily: 'Helvetica, Arial, sans-serif', textTransform: 'uppercase', display: 'inline-block', marginBottom: 40 }}>← Back</a>

        <h1 style={S.h1}>SYGNEO</h1>
        <p style={S.sub}>Terms of Use &amp; Privacy Policy</p>

        {/* ── TERMS OF USE ─────────────────────────────────────────────── */}
        <h2 style={S.h2}>1. Terms of Use</h2>
        <p style={S.p}>By using sygneo.com and placing an order, you agree to these terms. If you do not agree, please do not use this service.</p>

        <h2 style={S.h2}>2. Product Description</h2>
        <p style={S.p}>Sygneo produces custom heritage stamps based on a family profile you provide. Each stamp is a unique physical product crafted for rubber or metal engraving. Digital previews shown during the design process are approximations; minor variations in the final physical product are normal and expected.</p>

        <h2 style={S.h2}>3. Shipping &amp; Delivery — Important Disclaimer</h2>
        <p style={S.p}><strong>Sygneo cannot guarantee a specific delivery date.</strong> Delivery times depend on factors outside our control, including:</p>
        <ul aria-label="Shipping factors outside our control">
          <li style={S.li}>International postal and courier service schedules</li>
          <li style={S.li}>Customs clearance procedures in the destination country</li>
          <li style={S.li}>Public holidays, weather events, and regional disruptions</li>
          <li style={S.li}>Address accuracy provided by the customer</li>
        </ul>
        <p style={S.p}>We will provide a tracking number once your order is dispatched. If a package is delayed or undeliverable due to an incorrect address provided at checkout, re-shipping costs are the responsibility of the customer.</p>

        <h2 style={S.h2}>4. Ink — Shipping Restriction Notice</h2>
        <p style={S.p}>Your stamp will be shipped <strong>without ink</strong>. Stamp ink pads are classified as hazardous materials under international postal regulations and cannot be shipped with the product. Ink pads are widely available at stationery and office supply stores worldwide.</p>

        <h2 style={S.h2}>5. Returns &amp; Refunds</h2>
        <p style={S.p}>Because each seal is custom-made to order, we do not accept returns or offer refunds unless the product arrives damaged or significantly different from the approved digital design. Please contact us within 14 days of receipt if there is a manufacturing defect.</p>

        <h2 style={S.h2}>6. Intellectual Property</h2>
        <p style={S.p}>The generated seal designs are created algorithmically based on your input and are provided for your personal use. Sygneo retains no claim over designs once delivered to you. You may not reproduce or resell the Sygneo brand, name, or service.</p>

        <div style={S.divider} role="separator" />

        {/* ── PRIVACY POLICY ───────────────────────────────────────────── */}
        <h2 style={S.h2}>7. Privacy Policy</h2>
        <p style={S.p}>This Privacy Policy describes how Sygneo collects, uses, and protects your personal data. It is compliant with the <strong>EU General Data Protection Regulation (GDPR)</strong>, the California Consumer Privacy Act (CCPA), and applicable data protection laws worldwide.</p>

        <h2 style={S.h2}>8. Data We Collect</h2>
        <p style={S.p}>We collect only the minimum data necessary to process your order:</p>
        <ul aria-label="Data we collect">
          <li style={S.li}><strong>Family profile data</strong> (origin, occupation, values) — used solely to generate your seal design</li>
          <li style={S.li}><strong>Shipping address</strong> (recipient name, street, city, postal code, country) — used solely to deliver your order</li>
          <li style={S.li}><strong>Invoice name</strong> (optional) — used only if you request an invoice under a different name</li>
          <li style={S.li}><strong>Designer notes</strong> — optional text you choose to share about your preferences</li>
        </ul>
        <p style={S.p}>We do <strong>not</strong> collect payment card data (payments are handled by a third-party processor), browsing history, or device identifiers beyond what is technically necessary for the site to function.</p>

        <h2 style={S.h2}>9. How We Use Your Data</h2>
        <ul aria-label="How we use your data">
          <li style={S.li}><strong>Order fulfilment:</strong> generating your seal, production, and shipping</li>
          <li style={S.li}><strong>Customer service:</strong> responding to queries about your order</li>
          <li style={S.li}><strong>Legal compliance:</strong> retaining records as required by applicable law</li>
        </ul>
        <p style={S.p}>We do <strong>not</strong> use your data for advertising, profiling, or automated decision-making that produces legal effects.</p>

        <h2 style={S.h2}>10. Data Sharing — Third Parties</h2>
        <p style={S.p}><strong>Your personal data is never sold, rented, or shared with third parties for commercial purposes.</strong></p>
        <p style={S.p}>The only circumstances under which your data is shared are:</p>
        <ul aria-label="Data sharing circumstances">
          <li style={S.li}><strong>Shipping only:</strong> your name and address are provided to the courier or postal service solely to deliver your package</li>
          <li style={S.li}><strong>Legal obligation:</strong> if required by a court order or applicable law</li>
        </ul>

        <h2 style={S.h2}>11. Data Storage &amp; Security</h2>
        <p style={S.p}>Your data is stored securely using Upstash Redis with encryption at rest and in transit. Our infrastructure is hosted on Vercel, which maintains SOC 2 Type II compliance. Access to order data is restricted to authorised Sygneo team members only.</p>
        <p style={S.p}>We retain order data for a maximum of 3 years from the date of order, after which it is permanently deleted, unless longer retention is required by law.</p>

        <h2 style={S.h2}>12. Your Rights (GDPR &amp; Global)</h2>
        <p style={S.p}>Depending on your jurisdiction, you have the right to:</p>
        <ul aria-label="Your data rights">
          <li style={S.li}><strong>Access</strong> — request a copy of the data we hold about you</li>
          <li style={S.li}><strong>Rectification</strong> — request correction of inaccurate data</li>
          <li style={S.li}><strong>Erasure</strong> ("right to be forgotten") — request deletion of your data</li>
          <li style={S.li}><strong>Restriction</strong> — request that we limit processing of your data</li>
          <li style={S.li}><strong>Portability</strong> — receive your data in a structured, machine-readable format</li>
          <li style={S.li}><strong>Object</strong> — object to processing based on legitimate interests</li>
        </ul>
        <p style={S.p}>To exercise any of these rights, contact us at <strong>hello@sygneo.com</strong>. We will respond within 30 days.</p>

        <h2 style={S.h2}>13. Cookies</h2>
        <p style={S.p}>Sygneo uses only essential session cookies required for authentication (admin area only). We do not use tracking cookies, advertising cookies, or third-party analytics cookies. No cookie consent banner is required as no non-essential cookies are set.</p>

        <h2 style={S.h2}>14. Children&apos;s Privacy</h2>
        <p style={S.p}>This service is not directed to individuals under the age of 16. We do not knowingly collect data from minors.</p>

        <h2 style={S.h2}>15. Changes to This Policy</h2>
        <p style={S.p}>We may update these terms and privacy policy from time to time. Material changes will be noted with an updated &quot;Last updated&quot; date below. Continued use of the service after changes constitutes acceptance.</p>

        <h2 style={S.h2}>16. Contact</h2>
        <p style={S.p}>For any privacy, data, or order-related enquiries: <strong>hello@sygneo.com</strong></p>

        <div style={S.divider} role="separator" />
        <p style={S.updated}>Last updated: May 2026 · Sygneo Heritage Seals</p>
      </div>
    </main>
  );
}
