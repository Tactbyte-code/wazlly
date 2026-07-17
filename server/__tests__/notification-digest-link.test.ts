import { describe, it, expect, vi } from "vitest";

// The digest sender's only render path that ships in the absence of a
// configured `notificationTemplates` row is `buildDigestEmailHtml`. We
// test that helper directly rather than reaching through the entire
// digest flow, because the bug we are guarding against is exactly the
// "broken link / origin missing" branch decision in that helper.

vi.mock("../db", () => ({ db: {} }));

describe("notification digest fallback email body", () => {
  it("emits an absolute https Open Inbox anchor when origin is captured", async () => {
    const { buildDigestEmailHtml } = await import(
      "../services/notification.service"
    );
    const html = buildDigestEmailHtml(
      "You have 3 new messages",
      "https://panel.example.com"
    );
    expect(html).toContain('<a href="https://panel.example.com/inbox">');
    expect(html).toContain("Open Inbox");
    // Sanity: no relative-href, no empty-origin link, no double slash.
    expect(html).not.toMatch(/href="\/inbox"/);
    expect(html).not.toMatch(/href="http:\/\/\/inbox"/);
    expect(html).not.toMatch(/href="\/\/inbox"/);
  });

  it("falls back to a button-free plain-text body when origin is missing", async () => {
    const { buildDigestEmailHtml } = await import(
      "../services/notification.service"
    );
    const html = buildDigestEmailHtml("You have 3 new messages", null);
    expect(html).not.toContain("<a ");
    expect(html).not.toContain("href=");
    expect(html).toContain("Log in to your inbox");
  });

  it("strips templated URL anchors when origin is missing", async () => {
    const { stripUrlVarAnchors } = await import(
      "../services/notification.service"
    );
    const stripped = stripUrlVarAnchors(
      '<a href="{{appUrl}}/inbox" style="color:#fff">Open Inbox</a>'
    );
    expect(stripped).not.toContain("<a ");
    expect(stripped).not.toContain("{{appUrl}}");
    expect(stripped).toContain("Open Inbox");
  });
});
