export interface PlaybookTemplate {
  subject?: string
  body: string
}

export interface Playbook {
  id: string
  name: string
  tone: "professional" | "friendly" | "firm" | "empathetic" | "urgent"
  compliancePosture: "standard" | "strict" | "lenient"
  aiDefaults: {
    objective: string
    firmness: string
    language: string
  }
  templates: {
    email: PlaybookTemplate
    sms: PlaybookTemplate
    whatsapp: PlaybookTemplate
  }
}

export const playbooks: Playbook[] = [
  {
    id: "pb-general-reminder",
    name: "General Payment Reminder",
    tone: "professional",
    compliancePosture: "standard",
    aiDefaults: {
      objective: "reminder",
      firmness: "moderate",
      language: "English",
    },
    templates: {
      email: {
        subject: "Payment Reminder — Action Required",
        body: `Dear {{borrower_name}},

This is a reminder that your installment of AED {{amount_due}} was due on {{due_date}}.

To avoid additional charges, please make your payment at your earliest convenience using the link below.

[Make Payment]

If you have already made this payment, please disregard this notice.

Best regards,
Collections Team`,
      },
      sms: {
        body: `Reminder: Your payment of AED {{amount_due}} was due {{due_date}}. Please pay promptly to avoid charges. Pay now: {{payment_link}}`,
      },
      whatsapp: {
        body: `Hello {{borrower_name}}, this is a reminder that your payment of AED {{amount_due}} is overdue since {{due_date}}. Please make your payment at your earliest convenience. Reply HELP for assistance.`,
      },
    },
  },
  {
    id: "pb-tamara-friendly",
    name: "Tamara Friendly Reminder",
    tone: "friendly",
    compliancePosture: "lenient",
    aiDefaults: {
      objective: "reminder",
      firmness: "soft",
      language: "English",
    },
    templates: {
      email: {
        subject: "Hey {{borrower_name}} — quick reminder about your payment 👋",
        body: `Hey {{borrower_name}}!

Just a heads-up — you have a payment of AED {{amount_due}} that was due on {{due_date}}.

No stress, these things happen! You can sort it out in just a few taps:

[Pay Now — It's Quick!]

If you're having trouble, we're here to help. Just reply to this email.

Cheers,
The Tamara Team 💚`,
      },
      sms: {
        body: `Hey {{borrower_name}}! 👋 Your Tamara payment of AED {{amount_due}} is due. Tap to pay: {{payment_link}} — Questions? Just reply!`,
      },
      whatsapp: {
        body: `Hey {{borrower_name}}! 👋 Quick reminder — your Tamara payment of AED {{amount_due}} was due {{due_date}}. Pay in a few taps here: {{payment_link}}. Need help? Just message us!`,
      },
    },
  },
  {
    id: "pb-mashreq-final",
    name: "Mashreq Final Notice",
    tone: "firm",
    compliancePosture: "strict",
    aiDefaults: {
      objective: "final",
      firmness: "aggressive",
      language: "English",
    },
    templates: {
      email: {
        subject: "FINAL NOTICE — Immediate Action Required on Account {{account_number}}",
        body: `Dear Mr./Ms. {{borrower_name}},

Reference: Account {{account_number}}

This is a FINAL NOTICE regarding your overdue balance of AED {{amount_due}} which was due on {{due_date}}.

Despite previous reminders, this amount remains unpaid. If payment is not received within 7 calendar days from the date of this notice, we will be compelled to escalate this matter in accordance with UAE Central Bank regulations and our contractual terms.

To make your payment immediately:
[Pay Now]

To discuss a payment arrangement, contact our Customer Care Team at +971-4-XXX-XXXX during business hours (Sun–Thu, 9:00 AM – 5:00 PM GST).

This communication constitutes formal notice as required under applicable regulations.

Regards,
Customer Care Team
Mashreq Bank
Licensed and regulated by the Central Bank of the UAE`,
      },
      sms: {
        body: `FINAL NOTICE: Your Mashreq account {{account_number}} has AED {{amount_due}} overdue. Failure to pay within 7 days may result in further action. Call +971-4-XXX-XXXX.`,
      },
      whatsapp: {
        body: `Dear {{borrower_name}}, this is a final notice from Mashreq Bank regarding your overdue balance of AED {{amount_due}} on account {{account_number}}. Please make payment within 7 days to avoid further action. Contact Customer Care: +971-4-XXX-XXXX.`,
      },
    },
  },
];

export function getPlaybookById(id: string): Playbook | undefined {
  return playbooks.find((p) => p.id === id);
}
