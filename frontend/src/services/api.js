const API_BASE = "http://localhost:5000/api";

let refreshPromise = null;


const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
      .then(async (res) => {
        let data;

        try {
          data = await res.json();
        } catch {
          throw new Error("Session expired. Please log in again.");
        }

        if (!res.ok || !data.accessToken) {
          throw new Error("Session expired. Please log in again.");
        }

        localStorage.setItem("token", data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};


export const authenticatedFetch = async (url, options = {}) => {
  const sendRequest = (token) =>
    fetch(url, {
      ...options,
      credentials: "include",
      headers: {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

  let token = localStorage.getItem("token");
  let response = await sendRequest(token);

  if (response.status !== 401) {
    return response;
  }

  try {
    token = await refreshAccessToken();
    response = await sendRequest(token);
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }
    return response;
  } catch (error) {
    localStorage.removeItem("token");
    window.dispatchEvent(new Event("auth:session-expired"));
    throw error;
  }
};


export const requestSkillSwap = async (skillPostId, hoursRequested) => {
  const res = await authenticatedFetch(`${API_BASE}/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      skillPostId,
      hoursRequested: Number(hoursRequested),
    }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to request skill swap");
  }

  return data;
};


export const fetchMyRequests = async () => {
  const res = await authenticatedFetch(`${API_BASE}/requests/me`);

  if (!res.ok) {
    throw new Error("Failed to fetch requests");
  }

  return res.json();
};


export const updateRequestStatus = async (requestId, status) => {
  const res = await authenticatedFetch(
    `${API_BASE}/requests/${requestId}/status`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to update request status");
  }

  return data;
};


export const fetchSkills = async ({
  search = "",
  tag = "",
  sort = "newest",
  page = 1,
  limit = 12,
} = {}) => {
  const params = new URLSearchParams({
    search,
    tag,
    sort,
    page: String(page),
    limit: String(limit),
  });

  const res = await fetch(`${API_BASE}/skills?${params}`);

  if (!res.ok) {
    throw new Error("Failed to fetch skills");
  }

  return res.json();
};

export const fetchMySkills = async ({ page = 1, limit = 12 } = {}) => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  const res = await authenticatedFetch(`${API_BASE}/skills/mine?${params}`);

  if (!res.ok) {
    throw new Error("Failed to fetch your skills");
  }

  return res.json();
};

export const updateSkill = async (skillId, formData) => {
  const res = await authenticatedFetch(`${API_BASE}/skills/${skillId}`, {
    method: "PATCH",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data?.error?.message || data?.msg || "Failed to update skill"
    );
  }

  return data;
};

export const deleteSkill = async (skillId) => {
  const res = await authenticatedFetch(`${API_BASE}/skills/${skillId}`, {
    method: "DELETE",
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to delete skill");
  }

  return data;
};

export const fetchMyProfile = async () => {
  const res = await authenticatedFetch(`${API_BASE}/auth/me`);

  if (!res.ok) {
    throw new Error("Failed to fetch your profile");
  }

  return res.json();
};

export const createSkillPost = async (formData) => {
  const res = await authenticatedFetch(`${API_BASE}/skills`, {
    method: "POST",
    body: formData,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to create skill post");
  }

  return data;
};

export const getComments = async (postId) => {
  const res = await fetch(`http://localhost:5000/api/comments/${postId}`);
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
};


export const postComment = async (postId, text) => {
  const res = await authenticatedFetch(
    `${API_BASE}/comments/${postId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.msg || data.message || "Failed to post comment"
    );
  }

  return data;
};


export const fetchSingleSkill = async (id) => {
  const res = await fetch(`http://localhost:5000/api/skills/${id}`);
  if (!res.ok) throw new Error("Failed to fetch skill");
  return res.json();
};

export const registerUser = async (formData) => {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const contentType = res.headers.get("content-type");

  if (!res.ok) {
    if (contentType && contentType.includes("application/json")) {
      const error = await res.json();

      throw new Error(
        error?.error?.message ||
          error?.message ||
          error?.msg ||
          "Registration failed",
      );
    } else {
      throw new Error("Server error: not a JSON response");
    }
  }

  return res.json();
};

export const fetchChatMessages = async (roomId) => {
  if (!roomId) {
    throw new Error("Chat room ID is required");
  }

  const res = await authenticatedFetch(
    `${API_BASE}/chat/${encodeURIComponent(roomId)}`,
  );

  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("You are not authorized to access these messages.");
    }

    throw new Error("Failed to load messages");
  }

  return res.json();
};


export const sendChatMessage = async (roomId, text) => {
  if (!roomId) {
    throw new Error("Chat room ID is required");
  }

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Message cannot be empty");
  }

  const res = await authenticatedFetch(
    `${API_BASE}/chat/${encodeURIComponent(roomId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: text.trim() }),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to send message");
  }

  return data;
};

export const confirmRequestCompletion = async (requestId) => {
  const res = await authenticatedFetch(
    `${API_BASE}/requests/${requestId}/confirm-completion`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to confirm completion");
  }

  return data;
};


export const cancelRequest = async (requestId) => {
  const res = await authenticatedFetch(
    `${API_BASE}/requests/${requestId}/cancel`,
    {
      method: "POST",
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to cancel request");
  }

  return data;
};

export const scheduleSession = async (requestId, payload) => {
  const res = await authenticatedFetch(
    `${API_BASE}/requests/${requestId}/schedule`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.msg || "Failed to update session schedule");
  }

  return data;
};

export const fetchGamificationProfile = async () => {
  const res = await authenticatedFetch(`${API_BASE}/auth/gamification`);

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch gamification profile");
  }

  return data;
};

export const fetchLeaderboard = async (role, period = "all-time") => {
  const params = new URLSearchParams({ period });

  const res = await authenticatedFetch(
    `${API_BASE}/auth/leaderboard/${role}?${params}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch leaderboard");
  }

  return data;
};

export const fetchXPHistory = async (page = 1, limit = 10, role = "") => {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  if (role) {
    params.set("role", role);
  }

  const res = await authenticatedFetch(
    `${API_BASE}/auth/xp-history?${params}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch XP history");
  }

  return data;
};

export const fetchSeasonalEvents = async () => {
  const res = await authenticatedFetch(`${API_BASE}/events`);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch seasonal events");
  }

  return data;
};

export const joinSeasonalEvent = async (eventId, role) => {
  const res = await authenticatedFetch(`${API_BASE}/events/${eventId}/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to join seasonal event");
  }

  return data;
};

export const fetchEventProgress = async (eventId, role = "") => {
  const params = new URLSearchParams();

  if (role) params.set("role", role);

  const query = params.toString();
  const url = `${API_BASE}/events/${eventId}/progress${query ? `?${query}` : ""}`;

  const res = await authenticatedFetch(url);
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "Failed to fetch event progress");
  }

  return data;
};

export const fetchEventLeaderboard = async (
  eventId,
  role = "teacher"
) => {
  const params = new URLSearchParams({ role });

  const res = await authenticatedFetch(
    `${API_BASE}/events/${eventId}/leaderboard?${params}`
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(
      data.message || "Failed to fetch event leaderboard"
    );
  }

  return data;
};