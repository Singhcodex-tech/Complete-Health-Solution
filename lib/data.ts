import {
  TestTube2,
  HeartPulse,
  Syringe,
  Bandage,
  Footprints,
  Stethoscope,
  Scissors,
  Radiation,
  Activity,
  Dumbbell,
  Apple,
  PackageSearch,
  ShieldCheck,
  Video,
  Ambulance,
  Droplets,
  UserRound,
  Pill,
  UserCog,
  Wind,
  Cross,
  type LucideIcon,
} from "lucide-react";

export type Service = {
  slug: string;
  name: string;
  category: string;
  icon: LucideIcon;
  description: string;
  price: string;
  tint: "primary" | "accent";
};

export const services: Service[] = [
  { slug: "blood-test-booking", name: "Blood Test Booking", category: "Diagnostics", icon: TestTube2, description: "Certified phlebotomists collect samples at home with reports delivered digitally.", price: "From ₹299", tint: "primary" },
  { slug: "home-nursing-care", name: "Home Nursing Care", category: "Nursing", icon: HeartPulse, description: "24-hour or 12-hour trained nurses for post-surgical, elderly and critical care.", price: "From ₹1,299/day", tint: "accent" },
  { slug: "foleys-catheterization", name: "Foley's Catheterization", category: "Clinical Procedure", icon: Syringe, description: "Safe, sterile catheter insertion and care performed by licensed nurses.", price: "From ₹499", tint: "primary" },
  { slug: "ryles-tube-insertion", name: "Ryle's Tube Insertion", category: "Clinical Procedure", icon: Syringe, description: "Nasogastric tube placement for feeding or decompression, done at home.", price: "From ₹549", tint: "primary" },
  { slug: "iv-cannulation", name: "IV Cannulation", category: "Clinical Procedure", icon: Syringe, description: "Painless intravenous line placement for fluids, medication or transfusion.", price: "From ₹399", tint: "accent" },
  { slug: "iv-medication", name: "IV Medication", category: "Clinical Procedure", icon: Syringe, description: "Scheduled intravenous medication administration under nursing supervision.", price: "From ₹449", tint: "primary" },
  { slug: "im-injection", name: "IM Injection", category: "Clinical Procedure", icon: Syringe, description: "Intramuscular injections administered safely and hygienically at home.", price: "From ₹149", tint: "accent" },
  { slug: "sc-injection", name: "SC Injection", category: "Clinical Procedure", icon: Syringe, description: "Subcutaneous injections including insulin, administered by trained staff.", price: "From ₹149", tint: "primary" },
  { slug: "wound-dressing", name: "Wound Dressing", category: "Wound Care", icon: Bandage, description: "Sterile wound cleaning and dressing to support faster, safer healing.", price: "From ₹299", tint: "accent" },
  { slug: "bed-sore-care", name: "Bed Sore Care", category: "Wound Care", icon: Bandage, description: "Specialised pressure-ulcer management for bedridden patients.", price: "From ₹399", tint: "primary" },
  { slug: "diabetic-foot-care", name: "Diabetic Foot Care", category: "Wound Care", icon: Footprints, description: "Preventive and therapeutic foot care for patients living with diabetes.", price: "From ₹349", tint: "accent" },
  { slug: "stoma-dressing", name: "Stoma Dressing", category: "Wound Care", icon: Bandage, description: "Gentle stoma site cleaning, bag change and skin care at home.", price: "From ₹399", tint: "primary" },
  { slug: "suture-removal", name: "Suture Removal", category: "Clinical Procedure", icon: Scissors, description: "Post-operative stitch removal performed safely by a home-visit nurse.", price: "From ₹249", tint: "accent" },
  { slug: "pop-removal", name: "POP Removal", category: "Clinical Procedure", icon: Scissors, description: "Plaster of Paris cast removal with careful skin and joint check.", price: "From ₹399", tint: "primary" },
  { slug: "portable-xray", name: "Portable X-Ray", category: "Diagnostics", icon: Radiation, description: "Digital X-ray imaging brought directly to the patient's bedside.", price: "From ₹899", tint: "accent" },
  { slug: "ecg-at-home", name: "ECG at Home", category: "Diagnostics", icon: Activity, description: "12-lead ECG recording at home with cardiologist-reviewed reports.", price: "From ₹499", tint: "primary" },
  { slug: "physiotherapy", name: "Physiotherapy", category: "Rehabilitation", icon: Dumbbell, description: "Personalised mobility and pain-recovery sessions with expert physiotherapists.", price: "From ₹599/session", tint: "accent" },
  { slug: "nutrition-diet-consultation", name: "Nutrition & Diet Consultation", category: "Wellness", icon: Apple, description: "Customised diet planning for recovery, chronic conditions and wellness.", price: "From ₹499", tint: "primary" },
  { slug: "medical-equipment-arrangement", name: "Medical Equipment Arrangement", category: "Equipment", icon: PackageSearch, description: "Rent or buy hospital beds, oxygen concentrators, monitors and more.", price: "Custom quote", tint: "accent" },
  { slug: "medical-insurance-assistance", name: "Medical Insurance Assistance", category: "Insurance", icon: ShieldCheck, description: "End-to-end help with cashless claims, documentation and approvals.", price: "Free consultation", tint: "primary" },
  { slug: "online-doctor-consultation", name: "Online Doctor Consultation", category: "Consultation", icon: Video, description: "Video consultations with specialists across 20+ departments.", price: "From ₹399", tint: "accent" },
  { slug: "ambulance-services", name: "Ambulance Services", category: "Emergency", icon: Ambulance, description: "Road, railway and air ambulance dispatch for every emergency.", price: "From ₹799", tint: "primary" },
  { slug: "blood-donation", name: "Blood Donation", category: "Emergency", icon: Droplets, description: "Connect with verified donors or organise donation camps quickly.", price: "Free service", tint: "accent" },
  { slug: "doctor-home-visit", name: "Doctor Home Visit", category: "Consultation", icon: Stethoscope, description: "Qualified physicians visit your home for examination and treatment.", price: "From ₹999", tint: "primary" },
  { slug: "medicine-delivery", name: "Medicine Delivery", category: "Pharmacy", icon: Pill, description: "Prescription and OTC medicines delivered to your doorstep same-day.", price: "Free above ₹499", tint: "accent" },
  { slug: "female-patient-attendant", name: "Female Patient Attendant", category: "Nursing", icon: UserRound, description: "Compassionate female attendants for personal and daily-living support.", price: "From ₹999/day", tint: "primary" },
  { slug: "icu-care-at-home", name: "ICU Care at Home", category: "Critical Care", icon: HeartPulse, description: "Full intensive-care setup with monitoring, staffed by critical-care nurses.", price: "Custom quote", tint: "accent" },
  { slug: "ventilator-care-at-home", name: "Ventilator Care at Home", category: "Critical Care", icon: Wind, description: "Ventilator support and management at home under expert supervision.", price: "Custom quote", tint: "primary" },
  { slug: "oxygen-cylinder-supply", name: "Oxygen Cylinder Supply", category: "Equipment", icon: Wind, description: "Fast delivery of oxygen cylinders and concentrators, any time of day.", price: "From ₹1,199", tint: "accent" },
];

export const serviceCategories = Array.from(new Set(services.map((s) => s.category)));

export type OfferSubItem = { label: string; slug?: string };

export type OfferTile = {
  slug: string;
  title: string;
  icon: LucideIcon;
  tint: "primary" | "accent";
  description: string;
  price?: string;
  bookSlug: string;
  subItems?: OfferSubItem[];
};

export const homeOfferTiles: OfferTile[] = [
  {
    slug: "blood-test",
    title: "Blood Test",
    icon: TestTube2,
    tint: "primary",
    description: "Certified phlebotomists collect samples at home with reports delivered digitally.",
    price: "From ₹299",
    bookSlug: "blood-test-booking",
  },
  {
    slug: "nursing-care",
    title: "Nursing Care",
    icon: HeartPulse,
    tint: "accent",
    description: "24×7 or 12-hour nursing support plus every clinical procedure done safely at home.",
    bookSlug: "home-nursing-care",
    subItems: [
      { label: "24×7 / 12 hrs Nursing Care", slug: "home-nursing-care" },
      { label: "Foley's Catheterisation", slug: "foleys-catheterization" },
      { label: "Ryle's Tube Insertion", slug: "ryles-tube-insertion" },
      { label: "IV Cannulation", slug: "iv-cannulation" },
      { label: "IV / IM / SC Injection", slug: "iv-medication" },
      { label: "Wound Dressing", slug: "wound-dressing" },
      { label: "Back / Bed Sore Care", slug: "bed-sore-care" },
      { label: "Diabetic Foot Care", slug: "diabetic-foot-care" },
      { label: "Stoma Dressing", slug: "stoma-dressing" },
      { label: "Suture Removal", slug: "suture-removal" },
      { label: "POP Removal", slug: "pop-removal" },
    ],
  },
  {
    slug: "other-services",
    title: "Other Services",
    icon: Activity,
    tint: "primary",
    description: "Diagnostics, rehabilitation and wellness services delivered right to your doorstep.",
    bookSlug: "portable-xray",
    subItems: [
      { label: "Portable X-Ray", slug: "portable-xray" },
      { label: "ECG at Home", slug: "ecg-at-home" },
      { label: "Physiotherapy", slug: "physiotherapy" },
      { label: "Nutrition & Diet Counselling", slug: "nutrition-diet-consultation" },
      { label: "Medical Equipment Arrangement", slug: "medical-equipment-arrangement" },
    ],
  },
  {
    slug: "medical-insurance",
    title: "Medical Insurance",
    icon: ShieldCheck,
    tint: "accent",
    description: "Guidance and cashless claim support across India's leading insurers.",
    bookSlug: "medical-insurance-assistance",
    subItems: [
      { label: "Acko" },
      { label: "Star Health" },
      { label: "Niva Bupa" },
    ],
  },
  {
    slug: "online-doctor-consultation",
    title: "Online Doctor Consultation",
    icon: Video,
    tint: "primary",
    description: "Video consultations with specialists across 20+ departments.",
    price: "From ₹399",
    bookSlug: "online-doctor-consultation",
  },
  {
    slug: "ambulance-services",
    title: "Ambulance Services",
    icon: Ambulance,
    tint: "accent",
    description: "Road, railway and air ambulance dispatch for every emergency.",
    bookSlug: "ambulance-services",
    subItems: [
      { label: "Road Ambulance" },
      { label: "Railway Ambulance" },
      { label: "Air Ambulance" },
    ],
  },
  {
    slug: "blood-donor",
    title: "Blood Donor",
    icon: Droplets,
    tint: "primary",
    description: "Connect with verified donors or organise donation camps quickly.",
    price: "Free service",
    bookSlug: "blood-donation",
  },
  {
    slug: "doctor-home-visit",
    title: "Doctor at Home Visit",
    icon: Stethoscope,
    tint: "accent",
    description: "Qualified physicians visit your home for examination and treatment.",
    price: "From ₹999",
    bookSlug: "doctor-home-visit",
  },
  {
    slug: "medicines-on-request",
    title: "Medicines on Request",
    icon: Pill,
    tint: "primary",
    description: "Prescription and OTC medicines delivered to your doorstep same-day.",
    price: "Free above ₹499",
    bookSlug: "medicine-delivery",
  },
];

export type Doctor = {
  name: string;
  speciality: string;
  experience: string;
  languages: string[];
  rating: number;
  online: boolean;
  fee: string;
  initials: string;
};

export const doctors: Doctor[] = [
  { name: "Dr. Ananya Rao", speciality: "Cardiologist", experience: "14 yrs experience", languages: ["English", "Hindi", "Telugu"], rating: 4.9, online: true, fee: "₹699", initials: "AR" },
  { name: "Dr. Vikram Sen", speciality: "General Physician", experience: "9 yrs experience", languages: ["English", "Hindi", "Bengali"], rating: 4.7, online: true, fee: "₹399", initials: "VS" },
  { name: "Dr. Meera Nair", speciality: "Pediatrician", experience: "11 yrs experience", languages: ["English", "Malayalam"], rating: 4.8, online: true, fee: "₹499", initials: "MN" },
  { name: "Dr. Karan Mehta", speciality: "Orthopedic Surgeon", experience: "17 yrs experience", languages: ["English", "Hindi", "Gujarati"], rating: 4.9, online: false, fee: "₹899", initials: "KM" },
  { name: "Dr. Sara Iyer", speciality: "Dermatologist", experience: "8 yrs experience", languages: ["English", "Tamil"], rating: 4.6, online: true, fee: "₹549", initials: "SI" },
  { name: "Dr. Rohit Kapoor", speciality: "Neurologist", experience: "13 yrs experience", languages: ["English", "Hindi", "Punjabi"], rating: 4.8, online: false, fee: "₹999", initials: "RK" },
  { name: "Dr. Priya Deshmukh", speciality: "Gynecologist", experience: "12 yrs experience", languages: ["English", "Hindi", "Marathi"], rating: 4.9, online: true, fee: "₹649", initials: "PD" },
  { name: "Dr. Arjun Verma", speciality: "Diabetologist", experience: "10 yrs experience", languages: ["English", "Hindi"], rating: 4.7, online: true, fee: "₹499", initials: "AV" },
];

export const testimonials = [
  { name: "Sunita Reddy", role: "Daughter of a patient, Hyderabad", quote: "The home nurse arrived within two hours of booking and stayed with my father through his entire recovery. It felt like having a hospital ward at home.", rating: 5 },
  { name: "Manoj Chatterjee", role: "Patient, Kolkata", quote: "Booked a portable X-ray at 11pm and a technician showed up in under an hour. Reports were in my inbox before morning.", rating: 5 },
  { name: "Farah Sheikh", role: "Caregiver, Mumbai", quote: "Coordinating ICU equipment and a critical-care nurse used to take days. HealthCare+ set it up for my mother in an afternoon.", rating: 4.5 },
  { name: "Dev Malhotra", role: "Patient, Delhi", quote: "The online consultation felt as thorough as an in-clinic visit, and the prescription was couriered with medicines the same evening.", rating: 5 },
];

export const faqs = [
  { q: "How quickly can a nurse or doctor reach my home?", a: "In most metro areas, our teams reach you within 60–90 minutes for standard bookings and under 30 minutes for emergencies, depending on your location and staff availability." },
  { q: "Are your nurses and doctors verified?", a: "Every doctor, nurse and attendant on HealthCare+ is background-verified, licensed and trained, with credentials reviewed before onboarding." },
  { q: "Can I get cashless insurance for home care services?", a: "Yes. Our insurance desk works with major insurers to guide you through cashless claims and documentation for eligible services." },
  { q: "What areas do you currently service?", a: "We currently operate across major metro and tier-2 cities, with ambulance and emergency dispatch covering an even wider radius." },
  { q: "Can I reschedule or cancel a booking?", a: "Absolutely — bookings can be rescheduled or cancelled from your dashboard up to 2 hours before the scheduled time at no charge." },
];

export const nursingPlans = [
  { title: "12-Hour Day Nurse", price: "₹1,299", period: "/ day", features: ["Vitals monitoring", "Medication support", "Mobility assistance", "Daily progress notes"], highlight: false },
  { title: "24-Hour Full-Time Nurse", price: "₹2,199", period: "/ day", features: ["Round-the-clock care", "Vitals & medication", "Hygiene & mobility support", "Doctor coordination"], highlight: true },
  { title: "ICU-Trained Nurse", price: "₹2,999", period: "/ day", features: ["Critical care experience", "Ventilator familiarity", "Continuous monitoring", "Emergency response ready"], highlight: false },
  { title: "NICU-Trained Nurse", price: "₹3,199", period: "/ day", features: ["Newborn specialised care", "Feeding & hygiene support", "Growth monitoring", "Pediatrician coordination"], highlight: false },
  { title: "Senior Care Companion", price: "₹1,099", period: "/ day", features: ["Companionship & mobility", "Medication reminders", "Light housekeeping", "Daily wellness checks"], highlight: false },
  { title: "Post-Surgery Care", price: "₹1,799", period: "/ day", features: ["Wound & drain care", "Pain management support", "Mobility rehabilitation", "Follow-up coordination"], highlight: false },
];

export const labTests = [
  { name: "Complete Blood Count (CBC)", turnaround: "Reports in 6 hrs", price: "₹299" },
  { name: "Lipid Profile", turnaround: "Reports in 12 hrs", price: "₹499" },
  { name: "Thyroid Profile (T3, T4, TSH)", turnaround: "Reports in 12 hrs", price: "₹549" },
  { name: "HbA1c (Diabetes)", turnaround: "Reports in 8 hrs", price: "₹399" },
  { name: "Liver Function Test", turnaround: "Reports in 10 hrs", price: "₹599" },
  { name: "Kidney Function Test", turnaround: "Reports in 10 hrs", price: "₹599" },
  { name: "Vitamin D Test", turnaround: "Reports in 24 hrs", price: "₹899" },
  { name: "Full Body Checkup", turnaround: "Reports in 24 hrs", price: "₹1,999" },
];

export const equipment = [
  { name: "Hospital Bed", detail: "Electric & manual options with side rails", icon: "bed" },
  { name: "Wheelchair", detail: "Standard, reclining and travel-friendly models", icon: "wheelchair" },
  { name: "Ventilator", detail: "ICU-grade with trained technician support", icon: "wind" },
  { name: "BiPAP Machine", detail: "For respiratory support during sleep or rest", icon: "wind" },
  { name: "CPAP Machine", detail: "Continuous airway pressure therapy devices", icon: "wind" },
  { name: "Oxygen Cylinder", detail: "Refillable cylinders with regulator included", icon: "cylinder" },
  { name: "Patient Monitor", detail: "Tracks vitals: SpO2, BP, pulse and ECG", icon: "monitor" },
];

export const insurancePartners = [
  { name: "Star Health", type: "Cashless network", coverage: "Home care & hospitalisation" },
  { name: "HDFC ERGO", type: "Cashless network", coverage: "Diagnostics & procedures" },
  { name: "ICICI Lombard", type: "Cashless network", coverage: "Critical & emergency care" },
  { name: "Niva Bupa", type: "Cashless network", coverage: "Nursing & home care" },
  { name: "Care Health", type: "Cashless network", coverage: "Full spectrum coverage" },
  { name: "Tata AIG", type: "Cashless network", coverage: "Ambulance & emergency" },
];

export const stats = [
  { label: "Happy Patients", value: "2,40,000+" },
  { label: "Verified Doctors", value: "3,500+" },
  { label: "Home Visits Completed", value: "8,90,000+" },
  { label: "Avg. Emergency Response", value: "18 min" },
];

export const partners = ["Apollo Diagnostics", "Fortis Labs", "Max Healthcare", "Cipla", "Sun Pharma", "Manipal Hospitals"];

export { Cross };
