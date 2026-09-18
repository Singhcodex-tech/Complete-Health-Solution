import { Mail, MapPin, MessageCircle, PhoneCall } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import ContactForm from "@/components/ContactForm";

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-16 md:px-8">
      <SectionHeading
        eyebrow="Contact us"
        title="We're here, day or night"
        description="Reach out for bookings, partnerships, or general questions — our care coordinators respond fast."
      />

      <div className="mt-12 grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-4">
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper-raised p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
              <PhoneCall className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] text-ink-soft">Call us 24/7</p>
              <p className="text-[15px] font-semibold text-ink">1800-123-456</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper-raised p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-[13px] text-ink-soft">Email support</p>
              <p className="text-[15px] font-semibold text-ink">care@healthcareplus.in</p>
            </div>
          </div>
          <a
            href="https://wa.me/911800123456"
            className="flex items-center gap-4 rounded-2xl border border-line bg-paper-raised p-5 transition-colors hover:border-accent"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent-soft">
              <MessageCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-[13px] text-ink-soft">Chat on WhatsApp</p>
              <p className="text-[15px] font-semibold text-ink">+91 18001 23456</p>
            </div>
          </a>
          <div className="flex items-center gap-4 rounded-2xl border border-line bg-paper-raised p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-[13px] text-ink-soft">Head office</p>
              <p className="text-[15px] font-semibold text-ink">Koramangala, Bengaluru</p>
            </div>
          </div>

          <div className="flex h-52 items-center justify-center rounded-2xl border border-dashed border-line bg-paper-raised text-[13.5px] text-ink-soft">
            Google Maps embed placeholder
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-paper-raised p-6 md:p-8">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}
