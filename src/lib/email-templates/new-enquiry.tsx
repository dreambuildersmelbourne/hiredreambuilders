import React from "react";
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

export interface NewEnquiryEmailProps {
  eventName: string;
  eventDate: string;
  bumpInTime: string;
  bumpOutTime: string;
  rooms: string[];
  attendance?: number | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  customerOrganisation?: string | null;
  totalAmount: string;
  depositAmount: string;
  bookingReference: string;
  bookingLink: string;
  notes?: string | null;
  kitchenRequired?: boolean;
  foodServed?: boolean;
  soundRequired?: boolean;
  avRequired?: boolean;
  lightingRequired?: boolean;
  seatingChanges?: boolean;
  drumsRemoved?: boolean;
  extraStaffCount?: number;
  tentativeHold?: boolean;
}

const brand = "#c99726";
const dark = "#1e293b";

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Section style={{ marginBottom: "8px" }}>
      <Text style={{ margin: 0, fontSize: "12px", color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </Text>
      <Text style={{ margin: "4px 0 0", fontSize: "15px", color: dark, lineHeight: "1.5" }}>
        {value || "—"}
      </Text>
    </Section>
  );
}

function BoolList({ items }: { items: { label: string; value: boolean | undefined }[] }) {
  const active = items.filter((i) => i.value);
  if (active.length === 0) return null;
  return (
    <Text style={{ margin: "4px 0 0", fontSize: "14px", color: dark, lineHeight: "1.5" }}>
      {active.map((i) => i.label).join(" · ")}
    </Text>
  );
}

export const NewEnquiryEmail = ({
  eventName,
  eventDate,
  bumpInTime,
  bumpOutTime,
  rooms,
  attendance,
  customerName,
  customerEmail,
  customerPhone,
  customerOrganisation,
  totalAmount,
  depositAmount,
  bookingReference,
  bookingLink,
  notes,
  kitchenRequired,
  foodServed,
  soundRequired,
  avRequired,
  lightingRequired,
  seatingChanges,
  drumsRemoved,
  extraStaffCount,
  tentativeHold,
}: NewEnquiryEmailProps) => {
  const dateDisplay = (() => {
    try {
      return new Intl.DateTimeFormat("en-AU", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(new Date(eventDate));
    } catch {
      return eventDate;
    }
  })();

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New hire enquiry: {eventName}</Preview>
      <Body style={{ backgroundColor: "#f8f7f4", fontFamily: "Inter, Arial, sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ backgroundColor: "#ffffff", maxWidth: "600px", margin: "32px auto", padding: "32px", borderRadius: "12px", border: "1px solid #e2e2e2" }}>
          <Heading style={{ color: brand, fontFamily: "Georgia, serif", fontSize: "28px", marginBottom: "8px" }}>
            New hire enquiry
          </Heading>
          <Text style={{ fontSize: "16px", color: dark, marginTop: 0 }}>
            A customer submitted a venue hire estimate. Details below.
          </Text>

          {tentativeHold && (
            <Section style={{ backgroundColor: "#fff8e1", border: "1px solid #f0c36d", borderRadius: "8px", padding: "12px 16px", marginBottom: "20px" }}>
              <Text style={{ margin: 0, fontSize: "14px", color: "#7a5c12", fontWeight: 600 }}>
                Tentative hold requested
              </Text>
              <Text style={{ margin: "4px 0 0", fontSize: "13px", color: "#7a5c12" }}>
                The customer asked us to hold this date while the booking is reviewed.
              </Text>
            </Section>
          )}

          <Section style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
            <Field label="Event" value={eventName} />
            <Field label="Date" value={dateDisplay} />
            <Field label="Time" value={`${bumpInTime} – ${bumpOutTime}`} />
            <Field label="Rooms" value={rooms.join(", ")} />
            <Field label="Estimated attendance" value={attendance ? `${attendance}` : null} />
            <Field label="Reference" value={bookingReference} />
          </Section>

          <Section style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
            <Field label="Customer" value={customerName} />
            <Field label="Organisation" value={customerOrganisation} />
            <Field label="Email" value={customerEmail} />
            <Field label="Phone" value={customerPhone} />
          </Section>

          <Section style={{ backgroundColor: "#fafafa", borderRadius: "8px", padding: "20px", marginBottom: "24px" }}>
            <Field label="Estimated total" value={totalAmount} />
            <Field label="Deposit" value={depositAmount} />
            <BoolList
              items={[
                { label: "Kitchen required", value: kitchenRequired },
                { label: "Food served", value: foodServed },
                { label: "Sound required", value: soundRequired },
                { label: "AV required", value: avRequired },
                { label: "Lighting required", value: lightingRequired },
                { label: "Seating changes", value: seatingChanges },
                { label: "Drums removed", value: drumsRemoved },
                { label: `Extra crew × ${extraStaffCount ?? 0}`, value: (extraStaffCount ?? 0) > 0 },
              ]}
            />
            {notes && <Field label="Notes" value={notes} />}
          </Section>

          <Section style={{ textAlign: "center", marginTop: "32px" }}>
            <Button
              href={bookingLink}
              style={{
                backgroundColor: brand,
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Review in admin
            </Button>
          </Section>

          <Hr style={{ margin: "32px 0", borderColor: "#e2e2e2" }} />

          <Text style={{ fontSize: "12px", color: "#64748b", textAlign: "center" }}>
            Dreambuilders Venue Hire · This is an automated notification from the hire booking system.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: NewEnquiryEmail,
  subject: "New hire enquiry: {eventName}",
  displayName: "New estimate enquiry",
  previewData: {
    eventName: "Community Concert",
    eventDate: "2026-08-15",
    bumpInTime: "09:00",
    bumpOutTime: "13:00",
    rooms: ["Main Auditorium", "Kitchen"],
    attendance: 120,
    customerName: "Jane Smith",
    customerEmail: "jane@example.com",
    customerPhone: "0412 345 678",
    customerOrganisation: "Local Arts Group",
    totalAmount: "$1,250.00",
    depositAmount: "$250.00",
    bookingReference: "DB-0001",
    bookingLink: "https://hiredreambuilders.lovable.app/admin/bookings/00000000-0000-0000-0000-000000000000",
    notes: "We need access for setup from 8am.",
    kitchenRequired: true,
    foodServed: true,
    soundRequired: true,
    avRequired: true,
    lightingRequired: false,
    seatingChanges: false,
    drumsRemoved: false,
    extraStaffCount: 0,
    tentativeHold: true,
  },
} satisfies TemplateEntry;
