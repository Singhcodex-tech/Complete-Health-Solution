"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Send } from "lucide-react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center rounded-2xl border border-line bg-accent-soft p-10 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-accent" />
        <h3 className="mt-4 font-display text-xl font-semibold text-ink">
          Message sent
        </h3>
        <p className="mt-2 max-w-sm text-[14.5px] text-ink-soft">
          Thanks for reaching out — our care team will get back to you within
          a few hours.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-5 text-[13.5px] font-semibold text-primary"
        >
          Send another message
        </button>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-ink">Full Name</label>
        <input
          required
          type="text"
          placeholder="Your name"
          className="rounded-xl border border-line bg-paper-raised px-4 py-3 text-[14.5px] outline-none transition-colors focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-medium text-ink">Phone Number</label>
        <input
          required
          type="tel"
          placeholder="+91 98765 43210"
          className="rounded-xl border border-line bg-paper-raised px-4 py-3 text-[14.5px] outline-none transition-colors focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-[13px] font-medium text-ink">Email Address</label>
        <input
          required
          type="email"
          placeholder="you@example.com"
          className="rounded-xl border border-line bg-paper-raised px-4 py-3 text-[14.5px] outline-none transition-colors focus:border-primary"
        />
      </div>
      <div className="flex flex-col gap-1.5 sm:col-span-2">
        <label className="text-[13px] font-medium text-ink">Message</label>
        <textarea
          required
          rows={4}
          placeholder="Tell us how we can help..."
          className="resize-none rounded-xl border border-line bg-paper-raised px-4 py-3 text-[14.5px] outline-none transition-colors focus:border-primary"
        />
      </div>
      <button
        type="submit"
        className="flex items-center justify-center gap-2 rounded-full bg-primary py-3.5 text-[14.5px] font-semibold text-white transition-colors hover:bg-primary-dark sm:col-span-2"
      >
        Send Message <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
