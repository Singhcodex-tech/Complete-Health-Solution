const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, headers, ...rest } = options;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail ?? detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    throw new ApiError(detail, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type UserRole = "admin" | "doctor" | "patient" | "nurse" | "rider";

export type AuthResponse = {
  access_token: string;
  token_type: string;
  role: UserRole;
  full_name: string;
  user_id: string;
};

export type CurrentUser = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type Doctor = {
  id: string;
  speciality: string;
  experience_years: number;
  languages: string;
  consultation_fee: number;
  rating: number;
  is_online: boolean;
  bio: string | null;
  user: CurrentUser;
};

export type Booking = {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  service_slug: string;
  preferred_date: string;
  preferred_time: string;
  is_emergency: boolean;
  notes: string | null;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  created_at: string;
};

export type LabTest = {
  id: string;
  company_id: string;
  name: string;
  category: string;
  price: number;
  turnaround: string;
};

export type LabCompany = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  established: string;
  labs_count: string;
  tests: LabTest[];
};

export type LabImportResult = {
  detected_columns: Record<string, string>;
  total_rows: number;
  imported_count: number;
  skipped: { row: number; reason: string }[];
};

export type LoginOTPPending = {
  otp_required: true;
  user_id: string;
  message: string;
};

export type LoginResult = AuthResponse | LoginOTPPending;

export type OrderStatus =
  | "pending"
  | "assigned"
  | "picked_up"
  | "at_lab"
  | "completed"
  | "cancelled";

export type OTPPurpose = "rider_login" | "pickup" | "lab_dropoff";

export type OrderItem = {
  id: string;
  lab_test_id: string;
  lab_company_id: string;
  lab_company_name: string;
  test_name: string;
  price: number;
};

export type OrderLabDropoff = {
  lab_company_id: string;
  lab_company_name: string;
  verified_at: string | null;
};

export type Order = {
  id: string;
  patient_id: string;
  rider_id: string | null;
  pickup_address: string;
  pickup_date: string;
  pickup_time: string;
  notes: string | null;
  total_amount: number;
  status: OrderStatus;
  created_at: string;
  picked_up_at: string | null;
  at_lab_at: string | null;
  completed_at: string | null;
  items: OrderItem[];
  lab_dropoffs: OrderLabDropoff[];
};

export type Rider = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
};

export type AnalyticsSummary = {
  total_orders: number;
  total_revenue: number;
  orders_by_status: Record<string, number>;
  revenue_by_lab: Record<string, number>;
  rider_performance: {
    rider_id: string;
    rider_name: string;
    orders_assigned: number;
    orders_completed: number;
    revenue_handled: number;
  }[];
};

export const api = {
  auth: {
    register: (payload: {
      full_name: string;
      email: string;
      phone: string;
      password: string;
      role?: UserRole;
    }) =>
      request<AuthResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: { email: string; password: string }) =>
      request<LoginResult>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    verifyLoginOtp: (payload: { user_id: string; code: string }) =>
      request<AuthResponse>("/api/v1/auth/verify-login-otp", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    me: (token: string) =>
      request<CurrentUser>("/api/v1/auth/me", { token }),
  },

  patients: {
    me: (token: string) =>
      request<{
        id: string;
        age: number | null;
        gender: string | null;
        address: string | null;
        city: string | null;
        pincode: string | null;
        blood_group: string | null;
      }>("/api/v1/patients/me", { token }),

    updateMe: (
      token: string,
      payload: {
        age?: number;
        gender?: string;
        address?: string;
        city?: string;
        pincode?: string;
        blood_group?: string;
      }
    ) =>
      request<unknown>("/api/v1/patients/me", {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),
  },

  doctors: {
    list: (params?: { speciality?: string; online_only?: boolean }) => {
      const search = new URLSearchParams();
      if (params?.speciality) search.set("speciality", params.speciality);
      if (params?.online_only) search.set("online_only", "true");
      const qs = search.toString();
      return request<Doctor[]>(`/api/v1/doctors/${qs ? `?${qs}` : ""}`);
    },

    adminList: (token: string) => request<Doctor[]>("/api/v1/doctors/admin", { token }),

    adminCreate: (
      token: string,
      payload: {
        full_name: string;
        email: string;
        phone: string;
        password: string;
        speciality: string;
        experience_years?: number;
        languages?: string;
        consultation_fee?: number;
        is_online?: boolean;
        bio?: string;
      }
    ) =>
      request<Doctor>("/api/v1/doctors/admin", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),

    adminUpdate: (
      token: string,
      doctorId: string,
      payload: Partial<{
        full_name: string;
        email: string;
        phone: string;
        speciality: string;
        experience_years: number;
        languages: string;
        consultation_fee: number;
        is_online: boolean;
        bio: string;
      }>
    ) =>
      request<Doctor>(`/api/v1/doctors/admin/${doctorId}`, {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),

    adminDelete: (token: string, doctorId: string) =>
      request<void>(`/api/v1/doctors/admin/${doctorId}`, { method: "DELETE", token }),
  },

  bookings: {
    create: (
      token: string,
      payload: {
        service_slug: string;
        preferred_date: string;
        preferred_time: string;
        is_emergency?: boolean;
        notes?: string;
        doctor_id?: string;
      }
    ) =>
      request<Booking>("/api/v1/bookings/", {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),

    mine: (token: string) =>
      request<Booking[]>("/api/v1/bookings/me", { token }),
  },

  labs: {
    list: () => request<LabCompany[]>("/api/v1/labs/"),

    createCompany: (
      token: string,
      payload: { slug: string; name: string; tagline?: string; established?: string; labs_count?: string }
    ) =>
      request<LabCompany>("/api/v1/labs/", { method: "POST", token, body: JSON.stringify(payload) }),

    updateCompany: (
      token: string,
      companyId: string,
      payload: Partial<{ name: string; tagline: string; established: string; labs_count: string }>
    ) =>
      request<LabCompany>(`/api/v1/labs/${companyId}`, {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),

    deleteCompany: (token: string, companyId: string) =>
      request<void>(`/api/v1/labs/${companyId}`, { method: "DELETE", token }),

    createTest: (
      token: string,
      companyId: string,
      payload: { name: string; category: string; price: number; turnaround?: string }
    ) =>
      request<LabTest>(`/api/v1/labs/${companyId}/tests`, {
        method: "POST",
        token,
        body: JSON.stringify(payload),
      }),

    updateTest: (
      token: string,
      testId: string,
      payload: Partial<{ name: string; category: string; price: number; turnaround: string }>
    ) =>
      request<LabTest>(`/api/v1/labs/tests/${testId}`, {
        method: "PUT",
        token,
        body: JSON.stringify(payload),
      }),

    deleteTest: (token: string, testId: string) =>
      request<void>(`/api/v1/labs/tests/${testId}`, { method: "DELETE", token }),

    importTests: async (token: string, companyId: string, file: File): Promise<LabImportResult> => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${API_BASE_URL}/api/v1/labs/${companyId}/tests/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        let detail = res.statusText;
        try {
          const data = await res.json();
          detail = data.detail ?? detail;
        } catch {
          // not JSON, keep statusText
        }
        throw new ApiError(detail, res.status);
      }
      return res.json();
    },
  },

  orders: {
    create: (
      token: string,
      payload: {
        lab_test_ids: string[];
        pickup_address: string;
        pickup_date: string;
        pickup_time: string;
        notes?: string;
      }
    ) =>
      request<Order>("/api/v1/orders/", { method: "POST", token, body: JSON.stringify(payload) }),

    mine: (token: string) => request<Order[]>("/api/v1/orders/me", { token }),

    all: (token: string, params?: { status?: OrderStatus; rider_id?: string }) => {
      const search = new URLSearchParams();
      if (params?.status) search.set("status_filter", params.status);
      if (params?.rider_id) search.set("rider_id", params.rider_id);
      const qs = search.toString();
      return request<Order[]>(`/api/v1/orders/${qs ? `?${qs}` : ""}`, { token });
    },

    assignRider: (token: string, orderId: string, riderId: string) =>
      request<Order>(`/api/v1/orders/${orderId}/assign`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ rider_id: riderId }),
      }),

    complete: (token: string, orderId: string) =>
      request<Order>(`/api/v1/orders/${orderId}/complete`, { method: "PATCH", token }),

    analytics: (token: string) =>
      request<AnalyticsSummary>("/api/v1/orders/analytics/summary", { token }),

    riderMine: (token: string) => request<Order[]>("/api/v1/orders/rider/me", { token }),

    requestOtp: (token: string, orderId: string, purpose: OTPPurpose, labCompanyId?: string) =>
      request<{ message: string }>(`/api/v1/orders/${orderId}/otp/request`, {
        method: "POST",
        token,
        body: JSON.stringify({ purpose, lab_company_id: labCompanyId ?? null }),
      }),

    verifyOtp: (
      token: string,
      orderId: string,
      purpose: OTPPurpose,
      code: string,
      labCompanyId?: string
    ) =>
      request<{ message: string; order_status: OrderStatus | null }>(
        `/api/v1/orders/${orderId}/otp/verify`,
        {
          method: "POST",
          token,
          body: JSON.stringify({ purpose, code, lab_company_id: labCompanyId ?? null }),
        }
      ),
  },

  riders: {
    list: (token: string) => request<Rider[]>("/api/v1/users/riders", { token }),

    create: (
      token: string,
      payload: { full_name: string; email: string; phone: string; password: string }
    ) =>
      request<Rider>("/api/v1/users/riders", { method: "POST", token, body: JSON.stringify(payload) }),

    deactivate: (token: string, riderId: string) =>
      request<Rider>(`/api/v1/users/riders/${riderId}/deactivate`, { method: "PATCH", token }),
  },
};

export { API_BASE_URL };
