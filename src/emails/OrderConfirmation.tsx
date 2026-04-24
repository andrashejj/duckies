import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatPrice, shortOrderId } from "../lib/format";

type OrderItemData = {
  nameSnapshot: string;
  sku: string;
  size?: string | null;
  quantity: number;
  priceCentsSnapshot: number;
  lineTotalCents: number;
};

type Props = {
  orderId: string;
  guestToken: string;
  customerName: string;
  items: OrderItemData[];
  subtotalCents: number;
  totalCents: number;
  currency: string;
  paymentMethod: "JUICE" | "CASH" | "BANK";
  pickupMethod: "SESH" | "ARRANGE";
  customerNote?: string | null;
  siteUrl: string;
};

const paymentCopy: Record<Props["paymentMethod"], string> = {
  JUICE:
    "We'll reply from orders@sunsetduckies.com with the Juice number. Send the payment, screenshot the receipt, reply with the screenshot — kit goes live.",
  CASH:
    "Bring Rs to Tamarin Bay, Wednesday or Friday 4-6pm. Pay the coach, walk away with the kit.",
  BANK:
    "We'll reply with the club's bank details. Once the transfer clears, the kit is yours.",
};

const pickupCopy: Record<Props["pickupMethod"], string> = {
  SESH: "Pickup at Wednesday or Friday sesh, 4-6pm, Tamarin Bay.",
  ARRANGE: "We'll message you to arrange pickup or delivery in Tamarin.",
};

export default function OrderConfirmation(props: Props) {
  const {
    orderId,
    guestToken,
    customerName,
    items,
    subtotalCents,
    totalCents,
    currency,
    paymentMethod,
    pickupMethod,
    customerNote,
    siteUrl,
  } = props;

  const orderUrl = `${siteUrl}/orders/${orderId}?t=${guestToken}`;
  const shortId = shortOrderId(orderId);

  return (
    <Html>
      <Head />
      <Preview>Order {shortId} — we've got it. Payment details below.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerBar}>
            <Text style={kicker}>Sunset Duckies · Drop 001</Text>
            <Heading style={h1}>Order {shortId} is in.</Heading>
            <Text style={lede}>
              Thanks {customerName.split(" ")[0] ?? customerName} — we've got
              the order and we'll reply with payment details shortly. No
              charge has been made.
            </Text>
          </Section>

          <Section style={block}>
            <Text style={sectionTitle}>Your kit</Text>
            {items.map((item, idx) => (
              <Section key={idx} style={lineRow}>
                <Text style={lineName}>
                  {item.nameSnapshot}
                  {item.size ? ` · ${item.size}` : ""}
                </Text>
                <Text style={lineMeta}>
                  SKU {item.sku} · ×{item.quantity} ·{" "}
                  {formatPrice(item.priceCentsSnapshot, currency)} each
                </Text>
                <Text style={lineTotal}>
                  {formatPrice(item.lineTotalCents, currency)}
                </Text>
              </Section>
            ))}
            <Hr style={hr} />
            <Section style={totalsRow}>
              <Text style={totalsLabel}>Subtotal</Text>
              <Text style={totalsValue}>
                {formatPrice(subtotalCents, currency)}
              </Text>
            </Section>
            <Section style={totalsRow}>
              <Text style={totalsLabel}>Shipping</Text>
              <Text style={totalsValue}>Pickup · Rs 0</Text>
            </Section>
            <Section style={totalsRowBig}>
              <Text style={totalsLabelBig}>Total</Text>
              <Text style={totalsValueBig}>
                {formatPrice(totalCents, currency)}
              </Text>
            </Section>
          </Section>

          <Section style={blockAccent}>
            <Text style={sectionTitle}>How you'll pay</Text>
            <Text style={body2}>{paymentCopy[paymentMethod]}</Text>
            <Text style={sectionTitle}>How you'll pick up</Text>
            <Text style={body2}>{pickupCopy[pickupMethod]}</Text>
            {customerNote && (
              <>
                <Text style={sectionTitle}>Your note</Text>
                <Text style={body2}>{customerNote}</Text>
              </>
            )}
          </Section>

          <Section style={block}>
            <Text style={body2}>
              Track or reply to this order any time:{" "}
              <Link href={orderUrl} style={link}>
                {orderUrl}
              </Link>
            </Text>
            <Text style={footer}>
              Questions? Reply to this email or message us on WhatsApp. ✦ Sunset
              Duckies · Tamarin Bay, Mauritius
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#fff5de",
  fontFamily:
    "'Outfit', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  color: "#0b1620",
  margin: 0,
  padding: "32px 0",
};

const container: React.CSSProperties = {
  backgroundColor: "#fffaec",
  border: "2px solid #0b1620",
  borderRadius: 16,
  boxShadow: "6px 6px 0 0 #0b1620",
  maxWidth: 560,
  margin: "0 auto",
  padding: 0,
  overflow: "hidden",
};

const headerBar: React.CSSProperties = {
  backgroundColor: "#0b1620",
  color: "#fffaec",
  padding: "28px 28px 24px",
};

const kicker: React.CSSProperties = {
  color: "#ffd23f",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  margin: 0,
};

const h1: React.CSSProperties = {
  color: "#fffaec",
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontSize: 32,
  fontWeight: 700,
  lineHeight: 1.08,
  margin: "8px 0 12px",
};

const lede: React.CSSProperties = {
  color: "#fffaec",
  fontSize: 15,
  lineHeight: 1.55,
  margin: 0,
};

const block: React.CSSProperties = {
  padding: "24px 28px",
};

const blockAccent: React.CSSProperties = {
  backgroundColor: "#fff5de",
  padding: "20px 28px",
  borderTop: "1px dashed #0b1620",
  borderBottom: "1px dashed #0b1620",
};

const sectionTitle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#ff523c",
  margin: "8px 0 6px",
};

const lineRow: React.CSSProperties = {
  padding: "10px 0",
  borderBottom: "1px dashed rgba(11,22,32,0.2)",
};

const lineName: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 15,
  color: "#0b1620",
  margin: 0,
};

const lineMeta: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 11,
  color: "rgba(11,22,32,0.65)",
  margin: "4px 0 0",
};

const lineTotal: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  color: "#0b1620",
  margin: "4px 0 0",
  textAlign: "right",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "2px solid #0b1620",
  margin: "16px 0",
};

const totalsRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  margin: "4px 0",
  padding: 0,
};

const totalsRowBig: React.CSSProperties = {
  ...totalsRow,
  borderTop: "2px solid #0b1620",
  paddingTop: 10,
  marginTop: 10,
};

const totalsLabel: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  color: "rgba(11,22,32,0.7)",
  margin: 0,
};

const totalsValue: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13,
  color: "#0b1620",
  margin: 0,
};

const totalsLabelBig: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 18,
  color: "#0b1620",
  margin: 0,
};

const totalsValueBig: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 18,
  color: "#0b1620",
  margin: 0,
};

const body2: React.CSSProperties = {
  fontSize: 14,
  lineHeight: 1.55,
  color: "rgba(11,22,32,0.85)",
  margin: "0 0 10px",
};

const link: React.CSSProperties = {
  color: "#ff523c",
  textDecoration: "underline",
};

const footer: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(11,22,32,0.55)",
  marginTop: 20,
};
