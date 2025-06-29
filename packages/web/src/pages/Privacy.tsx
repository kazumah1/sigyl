import React from 'react';
import PageHeader from '@/components/PageHeader';

const Privacy = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader />
      <div className="container mx-auto px-6 py-16 mt-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
            Privacy Policy
          </h1>
          <p className="text-gray-400 mb-8">Last updated: June 2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                1. Introduction
              </h2>
              <p className="text-gray-300 leading-relaxed">
                SIGYL ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our Model Context Protocol (MCP) services, including our website, API, CLI tools, SDK, and marketplace (collectively, the "Services").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                2. Information We Collect
              </h2>
              <div className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Personal Information
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-3">
                    We may collect personal information that you provide directly to us, including:
                  </p>
                  <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                    <li>• Name, email address, and contact information</li>
                    <li>• Account credentials and authentication data</li>
                    <li>• Payment and billing information</li>
                    <li>• Communication preferences and marketing opt-ins</li>
                    <li>• Feedback, support requests, and correspondence</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Usage Information
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-3">
                    We automatically collect certain information about your use of our Services, including:
                  </p>
                  <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                    <li>• Log data (IP addresses, browser type, access times, pages viewed)</li>
                    <li>• Device information (device type, operating system, unique device identifiers)</li>
                    <li>• Usage patterns and analytics data</li>
                    <li>• Performance metrics and error logs</li>
                    <li>• API usage statistics and service interactions</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                    Technical Information
                  </h3>
                  <p className="text-gray-300 leading-relaxed mb-3">
                    We may collect technical information related to your use of our Services:
                  </p>
                  <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                    <li>• MCP server configurations and deployment data</li>
                    <li>• Integration settings and API keys (encrypted)</li>
                    <li>• Service performance and reliability metrics</li>
                    <li>• Security and authentication logs</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                3. How We Use Your Information
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  We use the information we collect for various purposes, including:
                </p>
                <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                  <li>• Providing, maintaining, and improving our Services</li>
                  <li>• Processing transactions and managing your account</li>
                  <li>• Communicating with you about our Services</li>
                  <li>• Providing customer support and technical assistance</li>
                  <li>• Analyzing usage patterns to enhance user experience</li>
                  <li>• Detecting and preventing fraud, abuse, and security threats</li>
                  <li>• Complying with legal obligations and enforcing our policies</li>
                  <li>• Conducting research and development to improve our Services</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                4. Information Sharing and Disclosure
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  We may share your information in the following circumstances:
                </p>
                <div className="space-y-3">
                  <p className="text-gray-300 leading-relaxed">
                    <strong>Service Providers:</strong> We may share information with trusted third-party service providers who assist us in operating our Services, such as cloud hosting providers, payment processors, and analytics services.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    <strong>Legal Requirements:</strong> We may disclose information if required by law, court order, or government request, or to protect our rights, property, or safety.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    <strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the transaction.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    <strong>Consent:</strong> We may share information with your explicit consent or at your direction.
                  </p>
                  <p className="text-gray-300 leading-relaxed">
                    <strong>Aggregated Data:</strong> We may share anonymized, aggregated data that does not identify individual users for research, analytics, or business purposes.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                5. Data Security
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  We implement appropriate technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure, or destruction. These measures include:
                </p>
                <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                  <li>• Encryption of data in transit and at rest</li>
                  <li>• Regular security assessments and vulnerability testing</li>
                  <li>• Access controls and authentication mechanisms</li>
                  <li>• Secure development practices and code reviews</li>
                  <li>• Employee training on data protection and privacy</li>
                </ul>
                <p className="text-gray-300 leading-relaxed">
                  However, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security of your information.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                6. Data Retention
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We retain your information for as long as necessary to provide our Services, comply with legal obligations, resolve disputes, and enforce our agreements. The retention period may vary depending on the type of information and the purpose for which it was collected. We will delete or anonymize your information when it is no longer needed for these purposes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                7. Your Rights and Choices
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  Depending on your location, you may have certain rights regarding your personal information:
                </p>
                <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                  <li>• <strong>Access:</strong> Request access to your personal information</li>
                  <li>• <strong>Correction:</strong> Request correction of inaccurate information</li>
                  <li>• <strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li>• <strong>Portability:</strong> Request a copy of your data in a portable format</li>
                  <li>• <strong>Restriction:</strong> Request restriction of processing</li>
                  <li>• <strong>Objection:</strong> Object to certain types of processing</li>
                </ul>
                <p className="text-gray-300 leading-relaxed">
                  To exercise these rights, please contact us at privacy@sigyl.ai. We will respond to your request within a reasonable timeframe and may require verification of your identity.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                8. Cookies and Tracking Technologies
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  We use cookies and similar tracking technologies to enhance your experience on our website and Services. These technologies help us:
                </p>
                <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                  <li>• Remember your preferences and settings</li>
                  <li>• Analyze website traffic and usage patterns</li>
                  <li>• Provide personalized content and advertisements</li>
                  <li>• Improve our Services and user experience</li>
                </ul>
                <p className="text-gray-300 leading-relaxed">
                  You can control cookie settings through your browser preferences. However, disabling certain cookies may affect the functionality of our Services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                9. Third-Party Services
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Our Services may contain links to third-party websites or integrate with third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies before providing any personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                10. International Data Transfers
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                11. Children's Privacy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Our Services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                12. Changes to This Privacy Policy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time to reflect changes in our practices or applicable laws. We will notify you of material changes by posting the updated policy on our website and updating the "Last updated" date. Your continued use of our Services after such changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                13. Contact Us
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  If you have any questions, concerns, or requests regarding this Privacy Policy or our privacy practices, please contact us:
                </p>
                <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-800">
                  <p className="text-gray-300 leading-relaxed">
                    <strong>Contact Information:</strong> COMING SOON
                  </p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy; 