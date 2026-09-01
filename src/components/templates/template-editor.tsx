"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowLeft,
  Type,
  AlignLeft,
  Image,
  MousePointerClick,
  Minus,
  Columns,
  QrCode,
  Code,
  Braces,
  Copy,
  Check,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const contentBlocks = [
  { icon: Type, label: "Heading" },
  { icon: AlignLeft, label: "Text" },
  { icon: Image, label: "Image" },
  { icon: MousePointerClick, label: "Button/CTA" },
  { icon: Minus, label: "Divider" },
  { icon: Columns, label: "Columns" },
  { icon: QrCode, label: "QR Code" },
  { icon: Code, label: "HTML" },
  { icon: Braces, label: "Variable" },
];

const dynamicVariables = [
  { token: "{{borrower_name}}", description: "Borrower's full name" },
  { token: "{{amount_due}}", description: "Outstanding amount (AED)" },
  { token: "{{due_date}}", description: "Payment due date" },
  { token: "{{dpd}}", description: "Days past due" },
  { token: "{{product_type}}", description: "Loan/Card type" },
  { token: "{{payment_link}}", description: "Unique payment URL" },
  { token: "{{agent_name}}", description: "Assigned agent" },
  { token: "{{company_name}}", description: "Lender name" },
];

const complianceChecks = [
  { label: "Opt-out link included", passed: true },
  { label: "Debt collection disclosure", passed: true },
  { label: "Company identification", passed: true },
  { label: "Arabic translation", passed: false },
];

function VariableToken({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-primary/20 text-primary border border-primary/30">
      {children}
    </span>
  );
}

function EmailPreview() {
  return (
    <Card className="mx-auto max-w-[480px] bg-[#111622] border-border/50">
      <CardContent className="p-0">
        {/* Email Header */}
        <div className="border-b border-border/30 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20">
              <span className="text-sm font-bold text-primary">CG</span>
            </div>
            <span className="text-sm font-semibold text-foreground">ClearGrid</span>
          </div>
        </div>

        {/* Email Body */}
        <div className="space-y-4 px-6 py-6">
          <p className="text-sm text-foreground/90">
            Dear <VariableToken>{"{{borrower_name}}"}</VariableToken>,
          </p>

          <p className="text-sm leading-relaxed text-foreground/70">
            We noticed your payment of{" "}
            <VariableToken>{"{{amount_due}}"}</VariableToken> was due on{" "}
            <VariableToken>{"{{due_date}}"}</VariableToken>. We understand that
            sometimes circumstances change, and we&apos;re here to help.
          </p>

          {/* CTA Button */}
          <div className="py-2 text-center">
            <span className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white">
              Pay Now &mdash; <VariableToken>{"{{amount_due}}"}</VariableToken>
            </span>
          </div>

          <p className="text-xs leading-relaxed text-foreground/50">
            If you&apos;ve already made this payment, please disregard this
            message. For payment plans or assistance, reply to this email or call
            us at +971 4 XXX XXXX.
          </p>
        </div>

        {/* Email Footer */}
        <div className="border-t border-border/30 px-6 py-4">
          <p className="text-center text-[11px] text-foreground/30">
            ClearGrid Financial Services | Dubai, UAE |{" "}
            <span className="underline cursor-pointer">Unsubscribe</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function TemplateEditor({
  initialChannel = "email",
  initialTemplateName,
}: {
  initialChannel?: "email" | "sms" | "whatsapp";
  initialTemplateName?: string;
} = {}) {
  const [templateName, setTemplateName] = useState(
    initialTemplateName ?? "Untitled Template",
  );
  const [activeChannel, setActiveChannel] = useState<"email" | "sms" | "whatsapp">(
    initialChannel,
  );
  const [subjectLine, setSubjectLine] = useState(
    "Payment Reminder — {{amount_due}} Due"
  );
  const [previewText, setPreviewText] = useState(
    "Your payment is overdue. Let's resolve this together."
  );
  const [fromName, setFromName] = useState("ClearGrid Collections");
  const [replyTo, setReplyTo] = useState("collections@cleargrid.co");
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const handleCopy = (token: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(token).catch(() => {});
    }
    setCopiedVar(token);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const channels = [
    { id: "email", label: "Email" },
    { id: "sms", label: "SMS" },
    { id: "whatsapp", label: "WhatsApp" },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/templates"
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-64 border-none bg-transparent text-lg font-semibold focus-visible:ring-0 focus-visible:border-transparent px-0"
          />
          <div className="flex items-center gap-1.5">
            {channels.map((ch) => (
              <button
                key={ch.id}
                onClick={() => setActiveChannel(ch.id as "email" | "sms" | "whatsapp")}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeChannel === ch.id
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "bg-muted text-muted-foreground border border-transparent hover:bg-muted/80"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.success(`Draft "${templateName}" saved`)}
          >
            Save Draft
          </Button>
          <Button
            size="sm"
            onClick={() => toast.success(`Template "${templateName}" activated`)}
          >
            Save &amp; Activate
          </Button>
        </div>
      </div>

      {/* Three-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Block Palette */}
        <div className="w-[200px] shrink-0 border-r border-border overflow-y-auto p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Content Blocks
          </h3>
          <div className="space-y-1">
            {contentBlocks.map((block) => (
              <div
                key={block.label}
                className="flex cursor-grab items-center gap-3 rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted"
              >
                <block.icon className="h-4 w-4 text-muted-foreground" />
                <span>{block.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Email Preview Canvas */}
        <div className="flex-1 overflow-y-auto bg-background/50 p-8">
          <EmailPreview />
        </div>

        {/* RIGHT: Properties Panel */}
        <div className="w-[280px] shrink-0 border-l border-border overflow-y-auto p-4">
          <h3 className="mb-4 text-sm font-semibold">Block Properties</h3>

          {/* Template Settings */}
          <div className="space-y-4">
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Template Settings
              </h4>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Subject Line
                  </label>
                  <Input
                    value={subjectLine}
                    onChange={(e) => setSubjectLine(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Preview Text
                  </label>
                  <Input
                    value={previewText}
                    onChange={(e) => setPreviewText(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    From Name
                  </label>
                  <Input
                    value={fromName}
                    onChange={(e) => setFromName(e.target.value)}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Reply-To
                  </label>
                  <Input
                    value={replyTo}
                    onChange={(e) => setReplyTo(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Dynamic Variables */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Dynamic Variables
              </h4>
              <div className="space-y-2">
                {dynamicVariables.map((v) => (
                  <div
                    key={v.token}
                    className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <code className="text-xs font-mono text-primary">
                        {v.token}
                      </code>
                      <p className="mt-0.5 text-[11px] text-muted-foreground truncate">
                        {v.description}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(v.token)}
                      className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      {copiedVar === v.token ? (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Compliance Checks */}
            <div>
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Compliance Checks
              </h4>
              <div className="space-y-2">
                {complianceChecks.map((check) => (
                  <div
                    key={check.label}
                    className="flex items-center gap-2 text-xs"
                  >
                    {check.passed ? (
                      <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                    )}
                    <span
                      className={
                        check.passed
                          ? "text-foreground/80"
                          : "text-amber-400"
                      }
                    >
                      {check.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
