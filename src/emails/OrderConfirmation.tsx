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

import { shortOrderId } from "../lib/format";

type OrderItemData = {
  nameSnapshot: string;
  sku: string;
  size?: string | null;
  quantity: number;
  kidName?: string | null;
};

type Props = {
  orderId: string;
  guestToken: string;
  customerName: string;
  items: OrderItemData[];
  pickupMethod: "SESH" | "ARRANGE";
  pickupNote?: string | null;
  customerNote?: string | null;
  siteUrl: string;
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
    pickupMethod,
    pickupNote,
    customerNote,
    siteUrl,
  } = props;

  const orderUrl = `${siteUrl}/orders/${orderId}?t=${guestToken}`;
  const shortId = shortOrderId(orderId);

  return (
    <Html>
      <Head />
      <Preview>Reservation {shortId} — locked in for sesh.</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerBar}>
            <Text style={kicker}>Sunset Duckies · Reservation</Text>
            <Heading style={h1}>You're in, {customerName.split(" ")[0] ?? customerName}.</Heading>
            <Text style={lede}>
              We've got the reservation. The kit goes to the printer with the
              next batch — we'll DM you on WhatsApp once it's ready to grab at
              sesh.
            </Text>
          </Section>

          <Section style={block}>
            <Text style={sectionTitle}>Your kit</Text>
            {items.map((item, idx) => (
              <Section key={idx} style={lineRow}>
                <Text style={lineName}>
                  {item.quantity} × {item.nameSnapshot}
                  {item.size ? ` · ${item.size}` : ""}
                </Text>
                {item.kidName && (
                  <Text style={lineMeta}>For {item.kidName}</Text>
                )}
              </Section>
            ))}
          </Section>

          <Section style={blockAccent}>
            <Text style={sectionTitle}>Pickup</Text>
            <Text style={body2}>{pickupCopy[pickupMethod]}</Text>
            {pickupNote && <Text style={body2}>{pickupNote}</Text>}
            {customerNote && (
              <>
                <Text style={sectionTitle}>Your note</Text>
                <Text style={body2}>{customerNote}</Text>
              </>
            )}
          </Section>

          <Section style={block}>
            <Text style={body2}>
              Track this reservation any time:{" "}
              <Link href={orderUrl} style={link}>
                {orderUrl}
              </Link>
            </Text>
            <Hr style={hr} />
            <Text style={footer}>
              ✦ Sunset Duckies · Tamarin Bay, Mauritius
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

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "2px solid #0b1620",
  margin: "16px 0",
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
