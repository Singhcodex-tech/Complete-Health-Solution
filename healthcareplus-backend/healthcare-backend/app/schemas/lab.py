from pydantic import BaseModel, ConfigDict


class LabTestCreate(BaseModel):
    name: str
    category: str
    price: float
    turnaround: str = "24 hrs"


class LabTestUpdate(BaseModel):
    name: str | None = None
    category: str | None = None
    price: float | None = None
    turnaround: str | None = None


class LabTestOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    company_id: str
    name: str
    category: str
    price: float
    turnaround: str


class LabCompanyCreate(BaseModel):
    slug: str
    name: str
    tagline: str = ""
    established: str = ""
    labs_count: str = ""


class LabCompanyUpdate(BaseModel):
    name: str | None = None
    tagline: str | None = None
    established: str | None = None
    labs_count: str | None = None


class LabCompanyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    slug: str
    name: str
    tagline: str
    established: str
    labs_count: str
    tests: list[LabTestOut] = []
