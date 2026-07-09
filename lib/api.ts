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

export type UserRole = "admin" | "doctor" | "patient" | "nurse";

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
      request<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    me: (token: string) =>
      request<CurrentUser>("/api/v1/auth/me", { token }),
  },

  patients: {
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
};

export { API_BASE_URL };
