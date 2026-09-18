from sqlalchemy.orm import Session

from app.models.lab import LabCompany, LabTest

SEED_COMPANIES = [
    {
        "slug": "apollo-diagnostics",
        "name": "Apollo Diagnostics",
        "tagline": "Part of the Apollo Hospitals network, trusted for accuracy since 1983.",
        "established": "1983",
        "labs_count": "1,500+ labs & collection centres",
        "tests": [
            {"name": "Complete Blood Count (CBC)", "category": "Blood Count", "price": 349, "turnaround": "6 hrs"},
            {"name": "HbA1c (Diabetes)", "category": "Diabetes", "price": 449, "turnaround": "8 hrs"},
            {"name": "Fasting Blood Sugar", "category": "Diabetes", "price": 149, "turnaround": "4 hrs"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 599, "turnaround": "12 hrs"},
            {"name": "Lipid Profile", "category": "Lipid Profile", "price": 549, "turnaround": "12 hrs"},
            {"name": "Liver Function Test", "category": "Liver Function", "price": 649, "turnaround": "10 hrs"},
            {"name": "Kidney Function Test", "category": "Kidney Function", "price": 649, "turnaround": "10 hrs"},
            {"name": "Vitamin D Test", "category": "Vitamins", "price": 999, "turnaround": "24 hrs"},
            {"name": "Vitamin B12 Test", "category": "Vitamins", "price": 799, "turnaround": "24 hrs"},
            {"name": "Cardiac Risk Marker (hs-CRP)", "category": "Cardiac", "price": 899, "turnaround": "24 hrs"},
            {"name": "Apollo Full Body Checkup", "category": "Full Body", "price": 2199, "turnaround": "24 hrs"},
        ],
    },
    {
        "slug": "pathkind-labs",
        "name": "Pathkind Labs",
        "tagline": "NABL-accredited diagnostics with same-day home collection across India.",
        "established": "2006",
        "labs_count": "900+ labs & collection centres",
        "tests": [
            {"name": "Complete Blood Count (CBC)", "category": "Blood Count", "price": 279, "turnaround": "6 hrs"},
            {"name": "HbA1c (Diabetes)", "category": "Diabetes", "price": 399, "turnaround": "8 hrs"},
            {"name": "Post Prandial Blood Sugar", "category": "Diabetes", "price": 159, "turnaround": "4 hrs"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 549, "turnaround": "12 hrs"},
            {"name": "Lipid Profile", "category": "Lipid Profile", "price": 499, "turnaround": "12 hrs"},
            {"name": "Liver Function Test", "category": "Liver Function", "price": 599, "turnaround": "10 hrs"},
            {"name": "Kidney Function Test", "category": "Kidney Function", "price": 599, "turnaround": "10 hrs"},
            {"name": "Vitamin D Test", "category": "Vitamins", "price": 899, "turnaround": "24 hrs"},
            {"name": "Pathkind Full Body Checkup", "category": "Full Body", "price": 1799, "turnaround": "24 hrs"},
        ],
    },
    {
        "slug": "dr-lal-pathlabs",
        "name": "Dr Lal PathLabs",
        "tagline": "One of India's largest diagnostic chains, NABL & CAP accredited.",
        "established": "1949",
        "labs_count": "2,500+ labs & collection centres",
        "tests": [
            {"name": "Complete Blood Count (CBC)", "category": "Blood Count", "price": 399, "turnaround": "6 hrs"},
            {"name": "HbA1c (Diabetes)", "category": "Diabetes", "price": 479, "turnaround": "8 hrs"},
            {"name": "Fasting Blood Sugar", "category": "Diabetes", "price": 169, "turnaround": "4 hrs"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 649, "turnaround": "12 hrs"},
            {"name": "Lipid Profile", "category": "Lipid Profile", "price": 599, "turnaround": "12 hrs"},
            {"name": "Liver Function Test", "category": "Liver Function", "price": 699, "turnaround": "10 hrs"},
            {"name": "Kidney Function Test", "category": "Kidney Function", "price": 699, "turnaround": "10 hrs"},
            {"name": "Vitamin D Test", "category": "Vitamins", "price": 1049, "turnaround": "24 hrs"},
            {"name": "Vitamin B12 Test", "category": "Vitamins", "price": 849, "turnaround": "24 hrs"},
            {"name": "Cardiac Risk Marker (hs-CRP)", "category": "Cardiac", "price": 949, "turnaround": "24 hrs"},
            {"name": "Dr Lal Full Body Checkup", "category": "Full Body", "price": 2499, "turnaround": "24 hrs"},
        ],
    },
    {
        "slug": "srl-diagnostics",
        "name": "SRL Diagnostics",
        "tagline": "Backed by Fortis Healthcare, one of the largest pathology networks in Asia.",
        "established": "1995",
        "labs_count": "400+ labs, 8,000+ collection points",
        "tests": [
            {"name": "Complete Blood Count (CBC)", "category": "Blood Count", "price": 369, "turnaround": "6 hrs"},
            {"name": "HbA1c (Diabetes)", "category": "Diabetes", "price": 459, "turnaround": "8 hrs"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 629, "turnaround": "12 hrs"},
            {"name": "Lipid Profile", "category": "Lipid Profile", "price": 579, "turnaround": "12 hrs"},
            {"name": "Liver Function Test", "category": "Liver Function", "price": 679, "turnaround": "10 hrs"},
            {"name": "Kidney Function Test", "category": "Kidney Function", "price": 679, "turnaround": "10 hrs"},
            {"name": "Vitamin D Test", "category": "Vitamins", "price": 999, "turnaround": "24 hrs"},
            {"name": "SRL Full Body Checkup", "category": "Full Body", "price": 2299, "turnaround": "24 hrs"},
        ],
    },
    {
        "slug": "metropolis-healthcare",
        "name": "Metropolis Healthcare",
        "tagline": "Pathology-led diagnostics with a strong focus on specialised testing.",
        "established": "1980",
        "labs_count": "300+ labs, 3,000+ collection centres",
        "tests": [
            {"name": "Complete Blood Count (CBC)", "category": "Blood Count", "price": 359, "turnaround": "6 hrs"},
            {"name": "HbA1c (Diabetes)", "category": "Diabetes", "price": 439, "turnaround": "8 hrs"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 609, "turnaround": "12 hrs"},
            {"name": "Lipid Profile", "category": "Lipid Profile", "price": 559, "turnaround": "12 hrs"},
            {"name": "Liver Function Test", "category": "Liver Function", "price": 659, "turnaround": "10 hrs"},
            {"name": "Vitamin D Test", "category": "Vitamins", "price": 979, "turnaround": "24 hrs"},
            {"name": "Vitamin B12 Test", "category": "Vitamins", "price": 779, "turnaround": "24 hrs"},
            {"name": "Metropolis Full Body Checkup", "category": "Full Body", "price": 2099, "turnaround": "24 hrs"},
        ],
    },
    {
        "slug": "thyrocare",
        "name": "Thyrocare",
        "tagline": "India's largest fully-automated diagnostic lab, known for affordable pricing.",
        "established": "1996",
        "labs_count": "3,300+ collection centres",
        "tests": [
            {"name": "Complete Blood Count (CBC)", "category": "Blood Count", "price": 249, "turnaround": "6 hrs"},
            {"name": "HbA1c (Diabetes)", "category": "Diabetes", "price": 349, "turnaround": "8 hrs"},
            {"name": "Thyroid Profile (T3, T4, TSH)", "category": "Thyroid", "price": 399, "turnaround": "12 hrs"},
            {"name": "Lipid Profile", "category": "Lipid Profile", "price": 399, "turnaround": "12 hrs"},
            {"name": "Liver Function Test", "category": "Liver Function", "price": 449, "turnaround": "10 hrs"},
            {"name": "Kidney Function Test", "category": "Kidney Function", "price": 449, "turnaround": "10 hrs"},
            {"name": "Vitamin D Test", "category": "Vitamins", "price": 699, "turnaround": "24 hrs"},
            {"name": "Thyrocare Aarogyam Full Body Checkup", "category": "Full Body", "price": 1399, "turnaround": "24 hrs"},
        ],
    },
]


def seed_lab_companies(db: Session) -> None:
    """Populate lab_companies/lab_tests on first run only — never overwrites
    existing rows, so edits made via the admin dashboard are never lost."""
    if db.query(LabCompany).first() is not None:
        return

    for company_data in SEED_COMPANIES:
        tests_data = company_data.pop("tests")
        company = LabCompany(**company_data)
        db.add(company)
        db.flush()
        for test_data in tests_data:
            db.add(LabTest(company_id=company.id, **test_data))

    db.commit()
