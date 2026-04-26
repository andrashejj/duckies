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

export type OrderStatusVariant =
  | "CONFIRMED"
  | "READY"
  | "FULFILLED"
  | "CANCELLED";

type Props = {
  variant: OrderStatusVariant;
  orderId: string;
  guestToken: string;
  customerName: string;
  items: OrderItemData[];
  adminNote?: string | null;
  siteUrl: string;
};

const copyByVariant: Record<
  OrderStatusVariant,
  { preview: string; kicker: string; heading: string; body: string }
> = {
  CONFIRMED: {
    preview: "Reservation locked in. We'll DM when it's ready.",
    kicker: "Confirmed",
    heading: "Locked in.",
    body: "Andras has reviewed your reservation and added it to the next print run. We'll message you on WhatsApp once it's ready to grab at sesh.",
  },
  READY: {
    preview: "Your kit is ready for pickup.",
    kicker: "Ready for pickup",
    heading: "Come grab it.",
    body: "Your kit is packed and waiting. Pickup at Wednesday or Friday sesh at Tamarin Bay, 4-6pm — or reply to this email to arrange another time.",
  },
  FULFILLED: {
    preview: "Kit handed over. Thanks for riding with Duckies.",
    kicker: "Picked up",
    heading: "Surf on.",
    body: "Kit's in your hands. Tag @sunsetduckies in your surf pics — we love seeing the lineup out on the water.",
  },
  CANCELLED: {
    preview: "Reservation cancelled.",
    kicker: "Cancelled",
    heading: "This one's off.",
    body: "Your reservation has been cancelled. If this is a surprise, hit reply and we'll sort it.",
  },
};

export default function OrderStatusEmail(props: Props) {
  const {
    variant,
    orderId,
    guestToken,
    customerName,
    items,
    adminNote,
    siteUrl,
  } = props;

  const shortId = shortOrderId(orderId);
  const orderUrl = `${siteUrl}/orders/${orderId}?t=${guestToken}`;
  const copy = copyByVariant[variant];

  return (
    <Html>
      <Head />
      <Preview>{copy.preview}</Preview>
      <Body style={body}>
        <Container style={container}>
          <Section style={headerBar}>
            <Text style={kicker}>
              Sunset Duckies · Reservation {shortId}
            </Text>
            <Heading style={h1}>{copy.heading}</Heading>
            <Text style={lede}>
              {customerName.split(" ")[0] ?? customerName} — {copy.body}
            </Text>
          </Section>

          <Section style={block}>
            <Text style={sectionTitle}>{copy.kicker.toUpperCase()}</Text>
            {items.map((item, idx) => (
              <Text key={idx} style={line}>
                {item.quantity} × {item.nameSnapshot}
                {item.size ? ` · ${item.size}` : ""}
                {item.kidName ? ` · for ${item.kidName}` : ""}
              </Text>
            ))}
            <Hr style={hr} />
            {adminNote && (
              <Text style={note}>
                <strong>Note from the club:</strong> {adminNote}
              </Text>
            )}
            <Text style={body2}>
              Track or reply:{" "}
              <Link href={orderUrl} style={link}>
                {orderUrl}
              </Link>
            </Text>
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
  fontSize: 30,
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

const sectionTitle: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#ff523c",
  margin: "8px 0 10px",
};

const line: React.CSSProperties = {
  fontSize: 14,
  color: "#0b1620",
  margin: "4px 0",
};

const note: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(11,22,32,0.85)",
  margin: "8px 0 14px",
  padding: "10px 12px",
  borderLeft: "3px solid #ffd23f",
  backgroundColor: "#fff5de",
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
