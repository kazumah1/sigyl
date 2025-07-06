import React from 'react';
import PageHeader from '@/components/PageHeader';

const Terms = () => {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <PageHeader />
      <div className="container mx-auto px-6 py-16 mt-16 max-w-4xl">
        <div className="prose prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-white mb-8" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
            Terms of Service
          </h1>
          <p className="text-gray-400 mb-8">Last updated: June 2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                1. Acceptance of Terms
              </h2>
              <p className="text-gray-300 leading-relaxed">
                By accessing and using SIGYL's services, including but not limited to our MCP server hosting, CLI tools, SDK, and registry ("Services"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you must not use our Services.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                2. Description of Services
              </h2>
              <p className="text-gray-300 leading-relaxed mb-4">
                SIGYL provides Model Context Protocol (MCP) server hosting, deployment tools, CLI utilities, SDK access, and a registry for MCP-related tools and services. Our Services are designed to facilitate the development, deployment, and management of AI agent integrations.
              </p>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify, suspend, or discontinue any aspect of our Services at any time, with or without notice.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                3. User Accounts and Responsibilities
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>Account Creation:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Acceptable Use:</strong> You agree to use our Services only for lawful purposes and in accordance with these Terms. You must not:
                </p>
                <ul className="text-gray-300 leading-relaxed ml-6 space-y-2">
                  <li>• Use the Services to transmit malicious code, viruses, or harmful content</li>
                  <li>• Attempt to gain unauthorized access to our systems or other users' data</li>
                  <li>• Interfere with or disrupt the Services or servers</li>
                  <li>• Violate any applicable laws or regulations</li>
                  <li>• Use the Services for any illegal or unauthorized purpose</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                4. Intellectual Property
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>Our Rights:</strong> SIGYL retains all rights, title, and interest in and to the Services, including all intellectual property rights. Our Services are protected by copyright, trademark, and other laws.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Your Content:</strong> You retain ownership of any content you create, upload, or transmit through our Services. By using our Services, you grant us a non-exclusive, worldwide, royalty-free license to use, store, and process your content solely for the purpose of providing the Services.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Third-Party Content:</strong> Our Services may include content from third parties. We are not responsible for third-party content and do not endorse or verify its accuracy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                5. Data and Privacy
              </h2>
              <p className="text-gray-300 leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our Services, you consent to our collection and use of information as described in our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                6. Service Availability and Support
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>Availability:</strong> We strive to maintain high service availability but do not guarantee uninterrupted access to our Services. We may perform maintenance, updates, or modifications that temporarily affect service availability.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Support:</strong> Support availability varies by service tier. Free tier users receive community support, while enterprise customers receive dedicated support as specified in their service agreements.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                7. Limitations of Liability
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>Disclaimer:</strong> TO THE MAXIMUM EXTENT PERMITTED BY LAW, SIGYL PROVIDES THE SERVICES "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Limitation:</strong> IN NO EVENT SHALL SIGYL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, OR USE, INCURRED BY YOU OR ANY THIRD PARTY.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Maximum Liability:</strong> SIGYL'S TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM OR RELATING TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE AMOUNT PAID BY YOU TO SIGYL IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                8. Indemnification
              </h2>
              <p className="text-gray-300 leading-relaxed">
                You agree to indemnify, defend, and hold harmless SIGYL and its officers, directors, employees, and agents from and against any claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising from or relating to your use of the Services or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                9. Termination
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>By You:</strong> You may terminate your account at any time by contacting us or using the account deletion features in our Services.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>By Us:</strong> We may terminate or suspend your access to the Services immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Effect of Termination:</strong> Upon termination, your right to use the Services ceases immediately. We may delete your account and data in accordance with our data retention policies.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                10. Modifications to Terms
              </h2>
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website and updating the "Last updated" date. Your continued use of the Services after such modifications constitutes acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                11. Governing Law and Dispute Resolution
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>Governing Law:</strong> These Terms are governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law principles.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Dispute Resolution:</strong> Any disputes arising from these Terms or the Services shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association, conducted in San Francisco, California.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-white mb-4" style={{ fontFamily: 'Space Grotesk, Inter, system-ui, sans-serif' }}>
                12. Miscellaneous
              </h2>
              <div className="space-y-4">
                <p className="text-gray-300 leading-relaxed">
                  <strong>Entire Agreement:</strong> These Terms constitute the entire agreement between you and SIGYL regarding the Services and supersede all prior agreements and understandings.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Severability:</strong> If any provision of these Terms is found to be unenforceable, the remaining provisions will continue in full force and effect.
                </p>
                <p className="text-gray-300 leading-relaxed">
                  <strong>Contact:</strong> info@sigyl.dev
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms; 