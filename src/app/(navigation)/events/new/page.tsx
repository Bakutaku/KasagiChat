import type { Metadata } from "next";

import { EventCreateForm } from "./event-create-form";

export const metadata: Metadata = {
  title: "イベントを作る | KasagiChat",
};

export default function NewEventPage() {
  return <EventCreateForm />;
}
