/**
 * Export a message snapshot to PDF-print HTML and/or XML.
 *
 * Rule: everything below reads from the passed-in `MessageSnapshot`, never
 * from the current template. If the template has changed post-send, exports
 * still reproduce exactly what the borrower received.
 */

import type { MessageSnapshot } from "@/data/message-snapshots"

/* ─────────────── Print-friendly HTML (PDF via browser print) ─────────────── */

/**
 * A self-contained HTML document styled for print. When opened in a new
 * window and `window.print()` is called, Chrome/Safari produce a real PDF
 * via the "Save as PDF" print destination. No PDF library required.
 *
 * Layout:
 *   HEADER — record-of-communication banner + borrower/account/lender
 *   META    — sent-at, delivery status, subject, sender, route
 *   BODY    — the sent email body (tracking pixel stripped upstream)
 *   FOOTER  — record-of-communication attestation line
 */
export function renderPrintableHtml(snap: MessageSnapshot): string {
  const dir = snap.language === "ar" ? "rtl" : "ltr"
  const font =
    snap.language === "ar"
      ? "Tajawal, 'Noto Naskh Arabic', 'IBM Plex Sans Arabic', Inter, sans-serif"
      : "Inter, Arial, sans-serif"

  const meta = [
    { label: "Campaign", value: snap.campaignName },
    { label: "Channel", value: snap.channel.toUpperCase() },
    { label: "Sender", value: `${snap.senderFromName}${snap.senderFromEmail ? ` <${snap.senderFromEmail}>` : ""}` },
    { label: "Reply-to", value: snap.replyTo ?? "—" },
    { label: "Route", value: snap.espRoute ?? "—" },
    { label: "Sent at (UTC)", value: snap.sentAt },
    { label: "Delivered at", value: snap.deliveredAt ?? "—" },
    { label: "Opened at", value: snap.openedAt ?? "—" },
    { label: "Clicked at", value: snap.clickedAt ?? "—" },
    { label: "Delivery status", value: snap.deliveryStatus.toUpperCase() },
    { label: "Variation", value: snap.variationLabel ?? "—" },
    { label: "Language", value: snap.language.toUpperCase() },
  ]

  return `<!doctype html>
<html lang="${snap.language === "ar" ? "ar" : "en"}" dir="${dir}">
<head>
<meta charset="utf-8">
<title>Record of Communication · ${escapeHtml(snap.campaignName)} · ${escapeHtml(snap.borrowerName)}</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: #FFFFFF;
    color: #0F172A;
    font-family: ${font};
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .page { max-width: 800px; margin: 0 auto; padding: 32px; }
  .banner { border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px; background: #F8FAFC; }
  .banner-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B; }
  .banner-title { font-size: 16px; font-weight: 700; color: #0F172A; margin-top: 2px; }
  .banner-sub { font-size: 12px; color: #475569; margin-top: 2px; }
  .who { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
  .who .cell { border: 1px solid #E5E7EB; border-radius: 4px; padding: 10px 12px; }
  .who .label { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: #64748B; }
  .who .value { font-size: 13px; color: #0F172A; margin-top: 2px; font-weight: 600; }
  .who .sub { font-size: 10px; color: #64748B; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, monospace; }
  .meta { border: 1px solid #E5E7EB; border-radius: 4px; padding: 10px 12px; margin-bottom: 20px; background: #FAFAFA; }
  .meta table { width: 100%; border-collapse: collapse; }
  .meta td { padding: 3px 8px; font-size: 11px; vertical-align: top; }
  .meta td.label { color: #64748B; width: 130px; font-weight: 600; }
  .meta td.value { color: #0F172A; font-family: ui-monospace, SFMono-Regular, monospace; word-break: break-all; }
  .subject { font-size: 15px; font-weight: 700; color: #0F172A; padding: 10px 0; margin-bottom: 8px; border-top: 2px solid #0F172A; border-bottom: 1px solid #E5E7EB; }
  .body-wrap { border: 1px solid #E5E7EB; padding: 0; margin-bottom: 20px; background: #FFFFFF; }
  .footer { font-size: 10px; color: #64748B; border-top: 1px solid #E5E7EB; padding-top: 12px; line-height: 1.6; }
  .footer strong { color: #0F172A; }
  .status-pill {
    display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase;
  }
  .status-delivered { background: #DCFCE7; color: #166534; }
  .status-bounced { background: #FEE2E2; color: #991B1B; }
  .status-pending { background: #FEF3C7; color: #92400E; }
  .status-failed { background: #FEE2E2; color: #991B1B; }
  @page { margin: 12mm; }
  @media print {
    body { background: #FFFFFF; }
    .page { padding: 0; max-width: none; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="page">
  <div class="banner">
    <div class="banner-eyebrow">Record of communication</div>
    <div class="banner-title">${escapeHtml(snap.campaignName)}</div>
    <div class="banner-sub">Sent to ${escapeHtml(snap.borrowerName)} · ${escapeHtml(snap.lenderName)} · ${escapeHtml(new Date(snap.sentAt).toUTCString())}</div>
  </div>

  <div class="who">
    <div class="cell">
      <div class="label">Borrower</div>
      <div class="value">${escapeHtml(snap.borrowerName)}</div>
      <div class="sub">Customer ID: ${escapeHtml(snap.borrowerCustomerId)}</div>
      <div class="sub">Account: ${escapeHtml(snap.borrowerAccountNumber)}</div>
    </div>
    <div class="cell">
      <div class="label">Lender</div>
      <div class="value">${escapeHtml(snap.lenderName)}</div>
      <div class="sub">Lender ID: ${escapeHtml(snap.lenderId)}</div>
      <div class="sub">Status: <span class="status-pill status-${snap.deliveryStatus}">${snap.deliveryStatus}</span></div>
    </div>
  </div>

  <div class="meta">
    <table>
      <tbody>
        ${meta.map((m) => `<tr><td class="label">${escapeHtml(m.label)}</td><td class="value">${escapeHtml(m.value)}</td></tr>`).join("")}
      </tbody>
    </table>
  </div>

  <div class="subject">Subject: ${escapeHtml(snap.subject)}</div>

  <div class="body-wrap">${snap.bodyHtml}</div>

  <div class="footer">
    <strong>Record of communication.</strong> This document reproduces the message ClearGrid sent
    to ${escapeHtml(snap.borrowerName)} on behalf of ${escapeHtml(snap.lenderName)} on
    ${escapeHtml(new Date(snap.sentAt).toUTCString())}. Delivery status
    (<span class="status-pill status-${snap.deliveryStatus}">${snap.deliveryStatus}</span>)
    reflects the state at the time of export. This is not a formally sealed legal notice —
    if a specific legal format is required, a separate legal template applies.
    <br/><br/>
    Snapshot ID: ${escapeHtml(snap.id)} · Exported ${escapeHtml(new Date().toUTCString())}
  </div>
</div>
</body>
</html>`
}

/* ─────────────── XML — structured data for bank ingestion ─────────────── */

/**
 * Structured XML with borrower identifiers, message metadata, and the body.
 * Not the raw email markup — the body is included as both HTML (CDATA) and
 * plain text. Format is a sensible default; will need agreement with banks.
 */
export function renderXml(snap: MessageSnapshot): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<CommunicationRecord xmlns="urn:cleargrid:communication:1.0">
  <ExportInfo>
    <ExportedAt>${new Date().toISOString()}</ExportedAt>
    <SnapshotId>${escapeXml(snap.id)}</SnapshotId>
    <Format>1.0</Format>
    <Kind>record-of-communication</Kind>
  </ExportInfo>
  <Borrower>
    <BorrowerId>${escapeXml(snap.borrowerId)}</BorrowerId>
    <FullName>${escapeXml(snap.borrowerName)}</FullName>
    <CustomerId>${escapeXml(snap.borrowerCustomerId)}</CustomerId>
    <AccountNumber>${escapeXml(snap.borrowerAccountNumber)}</AccountNumber>
  </Borrower>
  <Lender>
    <LenderId>${escapeXml(snap.lenderId)}</LenderId>
    <Name>${escapeXml(snap.lenderName)}</Name>
  </Lender>
  <Campaign>
    <MessageId>${escapeXml(snap.messageId)}</MessageId>
    <Name>${escapeXml(snap.campaignName)}</Name>
    ${snap.variationLabel ? `<Variation>${escapeXml(snap.variationLabel)}</Variation>` : ""}
  </Campaign>
  <Delivery>
    <Channel>${escapeXml(snap.channel)}</Channel>
    <SentAt>${escapeXml(snap.sentAt)}</SentAt>
    ${snap.deliveredAt ? `<DeliveredAt>${escapeXml(snap.deliveredAt)}</DeliveredAt>` : ""}
    ${snap.openedAt ? `<OpenedAt>${escapeXml(snap.openedAt)}</OpenedAt>` : ""}
    ${snap.clickedAt ? `<ClickedAt>${escapeXml(snap.clickedAt)}</ClickedAt>` : ""}
    ${snap.paidAt ? `<PaidAt>${escapeXml(snap.paidAt)}</PaidAt>` : ""}
    <Status>${escapeXml(snap.deliveryStatus)}</Status>
    ${snap.espRoute ? `<Route>${escapeXml(snap.espRoute)}</Route>` : ""}
  </Delivery>
  <Sender>
    <FromName>${escapeXml(snap.senderFromName)}</FromName>
    ${snap.senderFromEmail ? `<FromEmail>${escapeXml(snap.senderFromEmail)}</FromEmail>` : ""}
    ${snap.replyTo ? `<ReplyTo>${escapeXml(snap.replyTo)}</ReplyTo>` : ""}
  </Sender>
  <Content language="${snap.language}">
    <Subject>${escapeXml(snap.subject)}</Subject>
    ${snap.preheader ? `<Preheader>${escapeXml(snap.preheader)}</Preheader>` : ""}
    <BodyHtml><![CDATA[${snap.bodyHtml}]]></BodyHtml>
    <BodyText>${escapeXml(snap.bodyText)}</BodyText>
  </Content>
</CommunicationRecord>
`
}

/* ─────────────── Filename convention ─────────────── */

export function buildExportFilename(
  snap: MessageSnapshot,
  ext: "pdf" | "xml" | "html",
): string {
  const date = new Date(snap.sentAt).toISOString().slice(0, 10).replace(/-/g, "")
  const slug = snap.campaignName
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
  return `${snap.borrowerCustomerId}_${slug}_${date}.${ext}`
}

/* ─────────────── Escape helpers ─────────────── */

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function escapeXml(s: string): string {
  return escapeHtml(s)
}
