"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Plus, Upload } from "lucide-react";

export function LandingPageBuilder() {
  const [pageTitle, setPageTitle] = useState("Make a Payment");
  const [brandColor, setBrandColor] = useState("#0a0a0a");
  const [heroHeading, setHeroHeading] = useState("Make a Payment");
  const [heroSubheading, setHeroSubheading] = useState(
    "Resolve your outstanding balance quickly and securely."
  );
  const [bgStyle, setBgStyle] = useState("solid");
  const [fullPayment, setFullPayment] = useState(true);
  const [partialPayment, setPartialPayment] = useState(true);
  const [paymentPlan, setPaymentPlan] = useState(false);
  const [minPayment, setMinPayment] = useState("500");
  const [creditCard, setCreditCard] = useState(true);
  const [debitCard, setDebitCard] = useState(true);
  const [bankTransfer, setBankTransfer] = useState(true);
  const [applePay, setApplePay] = useState(false);
  const [googlePay, setGooglePay] = useState(false);
  const [termsText, setTermsText] = useState(
    "By proceeding with this payment, you acknowledge that the amount will be applied to your outstanding balance. All transactions are processed securely."
  );
  const [privacyLink, setPrivacyLink] = useState(
    "https://cleargrid.co/privacy"
  );
  const [debtNotice, setDebtNotice] = useState(true);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Action bar */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div>
          <h2 className="text-base font-semibold">Landing Page Builder</h2>
          <p className="text-xs text-muted-foreground">
            Build a payment landing page to embed in your outreach messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toast.info("Preview coming soon")}
          >
            Preview
          </Button>
          <Button
            size="sm"
            onClick={() => toast.success(`Landing page "${pageTitle}" published`)}
          >
            Publish
          </Button>
        </div>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Page Builder */}
        <div className="w-1/2 overflow-y-auto border-r border-border p-6 space-y-4">
          {/* Page Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Page Title
                </label>
                <Input
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Brand Color
                </label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-lg border border-border shrink-0"
                    style={{ backgroundColor: brandColor }}
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Logo Upload
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast.info("Logo upload coming soon", {
                      description: "PNG/SVG up to 2MB.",
                    })
                  }
                  className="flex h-20 w-full items-center justify-center rounded-lg border border-dashed border-border bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                >
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    <Upload className="h-5 w-5" />
                    <span className="text-xs">Click to upload logo</span>
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Hero Section */}
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Heading
                </label>
                <Input
                  value={heroHeading}
                  onChange={(e) => setHeroHeading(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Subheading
                </label>
                <Textarea
                  value={heroSubheading}
                  onChange={(e) => setHeroSubheading(e.target.value)}
                  rows={2}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Background Style
                </label>
                <Select
                  value={bgStyle}
                  onValueChange={(v) => setBgStyle(v ?? "solid")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="solid">Solid</SelectItem>
                    <SelectItem value="gradient">Gradient</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Payment Options */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">Full Payment</label>
                <Switch
                  checked={fullPayment}
                  onCheckedChange={(val) => setFullPayment(val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Partial Payment</label>
                <Switch
                  checked={partialPayment}
                  onCheckedChange={(val) => setPartialPayment(val)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Payment Plan</label>
                <Switch
                  checked={paymentPlan}
                  onCheckedChange={(val) => setPaymentPlan(val)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Minimum Payment (AED)
                </label>
                <Input
                  value={minPayment}
                  onChange={(e) => setMinPayment(e.target.value)}
                  type="number"
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Methods */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Credit Card", checked: creditCard, set: setCreditCard },
                { label: "Debit Card", checked: debitCard, set: setDebitCard },
                { label: "Bank Transfer", checked: bankTransfer, set: setBankTransfer },
                { label: "Apple Pay", checked: applePay, set: setApplePay },
                { label: "Google Pay", checked: googlePay, set: setGooglePay },
              ].map((method) => (
                <div key={method.label} className="flex items-center gap-2">
                  <Checkbox
                    checked={method.checked}
                    onCheckedChange={(val) => method.set(val as boolean)}
                  />
                  <label className="text-sm">{method.label}</label>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Custom Fields */}
          <Card>
            <CardHeader>
              <CardTitle>Custom Fields</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: "Emirates ID", required: true },
                { name: "Phone", required: true },
                { name: "Email", required: false },
              ].map((field) => (
                <div
                  key={field.name}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2"
                >
                  <span className="text-sm">{field.name}</span>
                  <span
                    className={`text-xs ${
                      field.required ? "text-amber-400" : "text-muted-foreground"
                    }`}
                  >
                    {field.required ? "Required" : "Optional"}
                  </span>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() =>
                  toast.info("Custom fields coming soon", {
                    description: "You'll be able to collect any borrower-provided field.",
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add Field
              </Button>
            </CardContent>
          </Card>

          {/* Legal/Compliance */}
          <Card>
            <CardHeader>
              <CardTitle>Legal / Compliance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Terms &amp; Conditions
                </label>
                <Textarea
                  value={termsText}
                  onChange={(e) => setTermsText(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Privacy Policy Link
                </label>
                <Input
                  value={privacyLink}
                  onChange={(e) => setPrivacyLink(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm">Debt Collection Notice</label>
                <Switch
                  checked={debtNotice}
                  onCheckedChange={(val) => setDebtNotice(val)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="w-1/2 overflow-y-auto bg-muted/40 p-8">
          <Card className="mx-auto max-w-[420px] bg-[#111622] border-border/50 overflow-hidden">
            <CardContent className="p-0">
              {/* Header */}
              <div className="border-b border-border/30 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${brandColor}33` }}
                  >
                    <span className="text-sm font-bold" style={{ color: brandColor }}>
                      CG
                    </span>
                  </div>
                  <span className="text-sm font-semibold">ClearGrid</span>
                </div>
              </div>

              {/* Hero */}
              <div className="px-6 py-8 text-center">
                <h2 className="text-xl font-bold text-foreground">{heroHeading}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{heroSubheading}</p>
              </div>

              {/* Account Summary */}
              <div className="mx-6 rounded-lg bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground">Outstanding Balance</p>
                <p className="mt-1 text-2xl font-bold text-foreground">AED 12,450</p>
              </div>

              {/* Payment Options */}
              <div className="px-6 py-4 space-y-2">
                {fullPayment && (
                  <label className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-primary">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Full Payment</p>
                      <p className="text-xs text-muted-foreground">AED 12,450</p>
                    </div>
                  </label>
                )}
                {partialPayment && (
                  <label className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-border" />
                    <div>
                      <p className="text-sm font-medium">Partial Payment</p>
                      <p className="text-xs text-muted-foreground">Min. AED {minPayment}</p>
                    </div>
                  </label>
                )}
                {paymentPlan && (
                  <label className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5 cursor-pointer hover:bg-muted/20 transition-colors">
                    <div className="flex h-4 w-4 items-center justify-center rounded-full border-2 border-border" />
                    <div>
                      <p className="text-sm font-medium">Payment Plan</p>
                      <p className="text-xs text-muted-foreground">Split into installments</p>
                    </div>
                  </label>
                )}
              </div>

              {/* Amount Input */}
              <div className="px-6 pb-4">
                <label className="mb-1 block text-xs text-muted-foreground">Amount (AED)</label>
                <div className="flex h-10 items-center rounded-lg border border-border/50 bg-muted/10 px-3">
                  <span className="text-sm text-muted-foreground">AED</span>
                  <span className="ml-2 text-sm font-medium">12,450</span>
                </div>
              </div>

              {/* Pay Now Button */}
              <div className="px-6 pb-6">
                <div
                  className="flex h-10 items-center justify-center rounded-lg text-sm font-semibold text-white"
                  style={{ backgroundColor: brandColor }}
                >
                  Pay Now
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-border/30 px-6 py-4">
                <p className="text-[10px] leading-relaxed text-muted-foreground/60">
                  {termsText.substring(0, 120)}
                  {termsText.length > 120 && "..."}
                </p>
                {debtNotice && (
                  <p className="mt-2 text-[10px] text-amber-400/60">
                    This is a communication from a debt collector. This is an attempt to collect a debt.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
