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
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  items: OrderItemData[];
  totalCents: number;
  currency: string;
  paymentMethod: "JUICE" | "CASH" | "BANK";
  pickupMethod: "SESH" | "ARRANGE";
  customerNote?: string | null;
  adminUrl: string;
};

export default function NewOrderAdmin(props: Props) {
  const shortId = shortOrderId(props.orderId);
  return (
    <Html>
      <Head />
      <Preview>
        New order {shortId} — {props.customerName} · {formatPrice(props.totalCents, props.currency)}
      </Preview>
      <Body style={body}>
        <Container style={container}>
          <Text style={kicker}>New order — follow up with payment</Text>
          <Heading style={h1}>Order {shortId}</Heading>
          <Text style={meta}>
            {props.customerName} · {props.customerEmail}
            {props.customerPhone ? ` · ${props.customerPhone}` : ""}
          </Text>
          <Text style={meta}>
            Payment: {props.paymentMethod} · Pickup: {props.pickupMethod}
          </Text>
          <Hr style={hr} />
          {props.items.map((item, idx) => (
            <Text key={idx} style={line}>
              {item.quantity} × {item.nameSnapshot}
              {item.size ? ` (${item.size})` : ""} —{" "}
              {formatPrice(item.lineTotalCents, props.currency)}
            </Text>
          ))}
          <Hr style={hr} />
          <Text style={total}>
            Total {formatPrice(props.totalCents, props.currency)}
          </Text>
          {props.customerNote && (
            <>
              <Text style={kicker}>Customer note</Text>
              <Text style={note}>{props.customerNote}</Text>
            </>
          )}
          <Link href={props.adminUrl} style={link}>
            Open order in admin →
          </Link>
        </Container>
      </Body>
    </Html>
  );
}

const body: React.CSSProperties = {
  backgroundColor: "#fffaec",
  fontFamily:
    "'Outfit', -apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif",
  color: "#0b1620",
  margin: 0,
  padding: 24,
};

const container: React.CSSProperties = {
  maxWidth: 560,
  margin: "0 auto",
  padding: 20,
  border: "2px solid #0b1620",
  backgroundColor: "#fffaec",
};

const kicker: React.CSSProperties = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 10,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#ff523c",
  margin: "8px 0",
};

const h1: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 26,
  margin: "0 0 6px",
  color: "#0b1620",
};

const meta: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(11,22,32,0.75)",
  margin: "2px 0",
};

const hr: React.CSSProperties = {
  border: "none",
  borderTop: "1px dashed #0b1620",
  margin: "14px 0",
};

const line: React.CSSProperties = {
  fontSize: 14,
  color: "#0b1620",
  margin: "4px 0",
};

const total: React.CSSProperties = {
  fontFamily: "'Bricolage Grotesque', sans-serif",
  fontWeight: 700,
  fontSize: 16,
  margin: "6px 0 14px",
};

const note: React.CSSProperties = {
  fontSize: 13,
  color: "rgba(11,22,32,0.8)",
  margin: "4px 0 14px",
  padding: "10px 12px",
  borderLeft: "3px solid #ffd23f",
  backgroundColor: "#fff5de",
};

const link: React.CSSProperties = {
  color: "#ff523c",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 12,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  textDecoration: "underline",
};
