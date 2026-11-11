const API_BASE = "http://localhost:5000/api";

export const adminLogin = async (email, password) => {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok || !data.accessToken) {
    throw new Error(data.msg || data.message || "Admin login failed");
  }

  return data;
};

export const fetchAdminDisputes = async (token) => {
  const res = await fetch(`${API_BASE}/admin/disputes`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || data.message || "Failed to load disputes");
  }

  return data;
};

export const resolveAdminDispute = async (
  token,
  requestId,
  decision,
  notes
) => {
  const res = await fetch(
    `${API_BASE}/admin/disputes/${requestId}/resolve`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ decision, notes }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || data.message || "Failed to resolve dispute");
  }

  return data;
};
export const fetchAdminEvents = async (token) => {
  const res = await fetch(`${API_BASE}/admin/events`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || data.message || "Failed to load events");
  }

  return data;
};

export const createAdminEvent = async (token, eventData) => {
  const res = await fetch(`${API_BASE}/admin/events`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || data.message || "Failed to create event");
  }

  return data;
};

export const updateAdminEvent = async (token, eventId, eventData) => {
  const res = await fetch(`${API_BASE}/admin/events/${eventId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(eventData),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || data.message || "Failed to update event");
  }

  return data;
};

export const publishAdminEvent = async (token, eventId) => {
  return adminEventAction(token, eventId, "publish");
};

export const pauseAdminEvent = async (token, eventId) => {
  return adminEventAction(token, eventId, "pause");
};

export const resumeAdminEvent = async (token, eventId) => {
  return adminEventAction(token, eventId, "resume");
};

export const cancelAdminEvent = async (token, eventId) => {
  return adminEventAction(token, eventId, "cancel");
};

const adminEventAction = async (token, eventId, action) => {
  const res = await fetch(
    `${API_BASE}/admin/events/${eventId}/${action}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.msg || data.message || `Failed to ${action} event`
    );
  }

  return data;
};

export const fetchAdminEventAnalytics = async (token, eventId) => {
  const res = await fetch(
    `${API_BASE}/admin/events/${eventId}/analytics`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to fetch event analytics"
    );
  }

  return data;
};