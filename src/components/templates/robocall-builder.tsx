"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  ArrowDown,
  CircleDot,
  PhoneForwarded,
  PhoneOff,
} from "lucide-react";

interface DtmfOption {
  key: string;
  action: string;
}

interface ScriptStep {
  id: number;
  message: string;
  voice: string;
  language: string;
  actionAfter: "wait" | "continue" | "transfer" | "end";
  dtmfOptions: DtmfOption[];
}

const defaultSteps: ScriptStep[] = [
  {
    id: 1,
    message:
      "Hello {{borrower_name}}, this is ClearGrid calling regarding your account with {{company_name}}. This is an attempt to collect a debt and any information obtained will be used for that purpose.",
    voice: "female",
    language: "english",
    actionAfter: "continue",
    dtmfOptions: [],
  },
  {
    id: 2,
    message:
      "You have an outstanding balance of {{amount_due}} dirhams, which was due on {{due_date}}. That is {{dpd}} days past the due date.",
    voice: "female",
    language: "english",
    actionAfter: "continue",
    dtmfOptions: [],
  },
  {
    id: 3,
    message:
      "Press 1 to make a payment now. Press 2 to speak with an agent. Press 3 to set up a payment plan.",
    voice: "female",
    language: "english",
    actionAfter: "wait",
    dtmfOptions: [
      { key: "1", action: "Transfer to payment IVR" },
      { key: "2", action: "Transfer to live agent" },
      { key: "3", action: "Transfer to payment plan setup" },
    ],
  },
  {
    id: 4,
    message:
      "Thank you for your time. If you need assistance, please call us at +971 4 XXX XXXX during business hours. Goodbye.",
    voice: "female",
    language: "english",
    actionAfter: "end",
    dtmfOptions: [],
  },
];

const actionIcons: Record<string, React.ReactNode> = {
  wait: <MessageSquare className="h-3.5 w-3.5" />,
  continue: <ArrowDown className="h-3.5 w-3.5" />,
  transfer: <PhoneForwarded className="h-3.5 w-3.5" />,
  end: <PhoneOff className="h-3.5 w-3.5" />,
};

const actionLabels: Record<string, string> = {
  wait: "Wait for Input",
  continue: "Continue",
  transfer: "Transfer to Agent",
  end: "End Call",
};

const actionColors: Record<string, string> = {
  wait: "text-amber-400",
  continue: "text-primary",
  transfer: "text-blue-400",
  end: "text-red-400",
};

export function RobocallBuilder() {
  const [steps, setSteps] = useState<ScriptStep[]>(defaultSteps);

  const updateStep = (id: number, field: keyof ScriptStep, value: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

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
          <h1 className="text-lg font-semibold">Robocall Script Builder</h1>
        </div>
        <Button
          size="sm"
          onClick={() => toast.success("Robocall script saved")}
        >
          Save
        </Button>
      </div>

      {/* Two-Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Script Steps */}
        <div className="w-1/2 overflow-y-auto border-r border-border p-6 space-y-4">
          {steps.map((step, idx) => (
            <Card key={step.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                    {idx + 1}
                  </span>
                  <h4 className="text-sm font-semibold">
                    Step {idx + 1}
                  </h4>
                </div>

                {/* Message */}
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Message Text
                  </label>
                  <Textarea
                    value={step.message}
                    onChange={(e) =>
                      updateStep(step.id, "message", e.target.value)
                    }
                    rows={3}
                    className="text-xs"
                  />
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    Use {"{{variable}}"} for dynamic values
                  </p>
                </div>

                {/* Voice & Language */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Voice
                    </label>
                    <Select
                      value={step.voice}
                      onValueChange={(v) =>
                        updateStep(step.id, "voice", v ?? "female")
                      }
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-muted-foreground">
                      Language
                    </label>
                    <Select
                      value={step.language}
                      onValueChange={(v) =>
                        updateStep(step.id, "language", v ?? "english")
                      }
                    >
                      <SelectTrigger className="w-full text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="english">English</SelectItem>
                        <SelectItem value="arabic">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action After */}
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">
                    Action After
                  </label>
                  <Select
                    value={step.actionAfter}
                    onValueChange={(v) =>
                      updateStep(
                        step.id,
                        "actionAfter",
                        v ?? "continue"
                      )
                    }
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wait">Wait for Input</SelectItem>
                      <SelectItem value="continue">Continue</SelectItem>
                      <SelectItem value="transfer">
                        Transfer to Agent
                      </SelectItem>
                      <SelectItem value="end">End Call</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* DTMF Options */}
                {step.actionAfter === "wait" &&
                  step.dtmfOptions.length > 0 && (
                    <div>
                      <label className="mb-2 block text-xs text-muted-foreground">
                        DTMF Options
                      </label>
                      <div className="space-y-2">
                        {step.dtmfOptions.map((opt) => (
                          <div
                            key={opt.key}
                            className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                          >
                            <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-bold text-foreground">
                              {opt.key}
                            </span>
                            <Input
                              value={opt.action}
                              readOnly
                              className="flex-1 border-none bg-transparent text-xs focus-visible:ring-0"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* RIGHT: Flow Preview */}
        <div className="w-1/2 overflow-y-auto bg-background/50 p-8">
          <h3 className="mb-6 text-sm font-semibold text-muted-foreground">
            Flow Preview
          </h3>

          <div className="relative ml-6">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            <div className="space-y-0">
              {/* Start node */}
              <div className="relative flex items-center gap-4 pb-6">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                  <Phone className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-primary">
                    Call Initiated
                  </p>
                </div>
              </div>

              {steps.map((step, idx) => (
                <div key={step.id} className="relative flex gap-4 pb-6">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border text-xs font-bold text-foreground">
                    {idx + 1}
                  </div>
                  <Card className="flex-1" size="sm">
                    <CardContent className="p-3">
                      <p className="text-xs leading-relaxed text-foreground/80 line-clamp-2">
                        {step.message.substring(0, 100)}
                        {step.message.length > 100 && "..."}
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                          <CircleDot className="h-3 w-3" />
                          {step.voice} / {step.language}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] ${
                            actionColors[step.actionAfter]
                          }`}
                        >
                          {actionIcons[step.actionAfter]}
                          {actionLabels[step.actionAfter]}
                        </span>
                      </div>
                      {step.actionAfter === "wait" &&
                        step.dtmfOptions.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {step.dtmfOptions.map((opt) => (
                              <span
                                key={opt.key}
                                className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[10px] text-muted-foreground"
                              >
                                <span className="font-bold text-foreground">
                                  {opt.key}
                                </span>{" "}
                                {opt.action}
                              </span>
                            ))}
                          </div>
                        )}
                    </CardContent>
                  </Card>
                </div>
              ))}

              {/* End node */}
              <div className="relative flex items-center gap-4">
                <div className="relative z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20 text-red-400">
                  <PhoneOff className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-400">
                    Call Ended
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
