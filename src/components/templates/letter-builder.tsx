"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";

function VariableToken({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-primary/20 text-primary border border-primary/30">
      {children}
    </span>
  );
}

export function LetterBuilder() {
  const [recipientName, setRecipientName] = useState("{{borrower_name}}");
  const [recipientAddress, setRecipientAddress] = useState(
    "{{borrower_address}}"
  );
  const [recipientCity, setRecipientCity] = useState("{{borrower_city}}");
  const [letterDate, setLetterDate] = useState("{{current_date}}");
  const [subject, setSubject] = useState(
    "RE: Outstanding Balance — Account #{{account_number}}"
  );
  const [body, setBody] = useState(
    `Dear {{borrower_name}},

We are writing to inform you that your account with {{company_name}} has an outstanding balance of {{amount_due}} AED, which was due on {{due_date}}.

We kindly request that you arrange payment at your earliest convenience. If you have already made this payment, please disregard this notice.

For payment arrangements or any queries regarding your account, please contact us at +971 4 XXX XXXX or reply to this letter.

We appreciate your prompt attention to this matter.`
  );
  const [signatureName, setSignatureName] = useState("Collections Department");
  const [signatureTitle, setSignatureTitle] = useState(
    "ClearGrid Financial Services"
  );
  const [includeQr, setIncludeQr] = useState(true);

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/templates"
            className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-lg font-semibold">Letter Builder</h1>
        </div>
        <Button
          size="sm"
          onClick={() => toast.success("Letter template saved")}
        >
          Save
        </Button>
      </div>

      {/* Two-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Form */}
        <div className="w-1/2 overflow-y-auto border-r border-border p-6 space-y-6">
          {/* Recipient Address */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Recipient Address</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Recipient Name
                </label>
                <Input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Street Address
                </label>
                <Input
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  City / Emirate
                </label>
                <Input
                  value={recipientCity}
                  onChange={(e) => setRecipientCity(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Letter Date */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Letter Date
            </label>
            <Input
              value={letterDate}
              onChange={(e) => setLetterDate(e.target.value)}
            />
          </div>

          {/* Subject / Reference */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Subject / Reference
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          {/* Body */}
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">
              Letter Body
            </label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={12}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Use {"{{variable_name}}"} to insert dynamic values
            </p>
          </div>

          {/* Signature */}
          <div>
            <h3 className="mb-3 text-sm font-semibold">Signature Block</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Name
                </label>
                <Input
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Title / Company
                </label>
                <Input
                  value={signatureTitle}
                  onChange={(e) => setSignatureTitle(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* QR Code toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Include QR Code</p>
              <p className="text-xs text-muted-foreground">
                Add a payment QR code to the letter
              </p>
            </div>
            <Switch
              checked={includeQr}
              onCheckedChange={(val) => setIncludeQr(val)}
            />
          </div>
        </div>

        {/* RIGHT: A4 Preview */}
        <div className="w-1/2 overflow-y-auto bg-background/50 p-8">
          <Card className="mx-auto max-w-[520px] bg-[#111622] border-border/50">
            <CardContent className="p-8 space-y-6">
              {/* Letterhead */}
              <div className="flex items-center justify-between border-b border-border/30 pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20">
                    <span className="text-base font-bold text-primary">
                      CG
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold">ClearGrid</p>
                    <p className="text-[11px] text-muted-foreground">
                      Financial Services
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground">
                  <p>P.O. Box 12345</p>
                  <p>Dubai, UAE</p>
                </div>
              </div>

              {/* Date */}
              <p className="text-xs text-muted-foreground">
                {letterDate}
              </p>

              {/* Recipient */}
              <div className="text-xs text-foreground/80 space-y-0.5">
                <p>{recipientName}</p>
                <p>{recipientAddress}</p>
                <p>{recipientCity}</p>
              </div>

              {/* Subject */}
              <p className="text-xs font-semibold text-foreground">
                {subject}
              </p>

              {/* Body */}
              <div className="text-xs leading-relaxed text-foreground/70 whitespace-pre-line">
                {body}
              </div>

              {/* Signature */}
              <div className="pt-4 text-xs text-foreground/70 space-y-1">
                <p>Yours sincerely,</p>
                <div className="pt-6">
                  <p className="font-semibold text-foreground/90">
                    {signatureName}
                  </p>
                  <p>{signatureTitle}</p>
                </div>
              </div>

              {/* QR Code */}
              {includeQr && (
                <div className="flex items-center gap-3 border-t border-border/30 pt-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20">
                    <span className="text-[9px] text-muted-foreground text-center">
                      QR Code
                    </span>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium text-foreground/80">
                      Scan to Pay
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      <VariableToken>{"{{payment_link}}"}</VariableToken>
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
