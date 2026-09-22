import type { Metadata } from "next";

import { EventsList } from "./events-list";

export const metadata: Metadata = {
  title: "イベント | KasagiChat",
};

export default function EventsPage() {
  return <EventsList />;
}
