const API_BASE_URL = "http://localhost:5000";

/**
 * Helper to perform HTTP requests and return JSON.
 */
async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  const headers = {
    ...options.headers,
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

  try {
    const response = await fetch(url, {
      headers,
      ...options,
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } catch {
        // If response is not JSON
        try {
          errorMessage = await response.text();
        } catch {
          // Fallback when response text cannot be parsed
        }
      }
      throw new Error(errorMessage);
    }

    // Handle CSV attachment response or binary data
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/csv")) {
      return response.blob();
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error("Request timed out. Please check your internet connection or try again later.", { cause: error });
    }
    throw error;
  }
}

export const api = {
  /**
   * Submit corporate enquiry form
   */
  createEnquiry: (data) => {
    return request("/api/create", {
      method: "POST",
      body: data instanceof FormData ? data : JSON.stringify(data),
    });
  },

  /**
   * Fetch list of enquiries with optional filters
   */
  getEnquiries: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return request(`/api/list${queryString}`);
  },

  /**
   * Fetch specific enquiry details, quotation, logs
   */
  getEnquiryDetail: (id) => {
    return request(`/api/detail/${id}`);
  },

  /**
   * Move status or update details
   */
  processEnquiry: (id, processData) => {
    return request(`/api/process/${id}`, {
      method: "POST",
      body: JSON.stringify(processData),
    });
  },

  /**
   * Fetch dashboard aggregated numbers
   */
  getDashboardCounts: () => {
    return request("/api/dashboard");
  },

  /**
   * Save or update proposed quotation
   */
  saveQuotation: (id, quotationData) => {
    return request(`/api/quotation/${id}`, {
      method: "POST",
      body: JSON.stringify(quotationData),
    });
  },

  /**
   * Process follow up message and optional email trigger
   */
  saveFollowup: (id, followupData) => {
    return request(`/api/followup/${id}`, {
      method: "POST",
      body: JSON.stringify(followupData),
    });
  },

  /**
   * Trigger AI recommendation suggest
   */
  getGeminiSuggestion: (id, force = false) => {
    return request(`/api/gemini-suggestion/${id}`, {
      method: "POST",
      body: JSON.stringify({ force }),
    });
  },

  /**
   * Returns CSV Export link URL
   */
  getExportCsvUrl: () => {
    return `${API_BASE_URL}/api/export/csv`;
  },

  // --- New Advanced Features APIs ---

  // Personalizations
  createPersonalization: (formData) => {
    return request("/api/personalizations", {
      method: "POST",
      body: formData, // FormData directly handles headers properly
    });
  },
  getPersonalizations: (status = "") => {
    return request(`/api/personalizations${status ? '?status='+status : ''}`);
  },
  updatePersonalizationStatus: (id, status) => {
    return request(`/api/personalizations/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
  },

  // Design Approvals
  uploadDesignMockup: (formData) => {
    return request("/api/design_approvals", {
      method: "POST",
      body: formData,
    });
  },
  getDesignApprovals: (personalizationId = "") => {
    return request(`/api/design_approvals${personalizationId ? '?personalization_id='+personalizationId : ''}`);
  },
  updateDesignApproval: (id, updateData) => {
    return request(`/api/design_approvals/${id}`, {
      method: "PUT",
      body: JSON.stringify(updateData)
    });
  },

  // Inventory
  addInventoryProduct: (data) => {
    return request("/api/inventory", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getInventory: () => {
    return request("/api/inventory");
  },
  updateInventoryProduct: (id, data) => {
    return request(`/api/inventory/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  deleteInventoryProduct: (id) => {
    return request(`/api/inventory/${id}`, {
      method: "DELETE"
    });
  },

  // Occasions Calendar
  addOccasion: (data) => {
    return request("/api/occasions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  getOccasions: () => {
    return request("/api/occasions");
  },
  getOccasionReminders: () => {
    return request("/api/occasions/reminders");
  },
  updateOccasion: (id, data) => {
    return request(`/api/occasions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  deleteOccasion: (id) => {
    return request(`/api/occasions/${id}`, {
      method: "DELETE"
    });
  },

  // Returns
  submitReturn: (formData) => {
    return request("/api/returns", {
      method: "POST",
      body: formData,
    });
  },
  getReturns: (status = "") => {
    return request(`/api/returns${status ? '?status='+status : ''}`);
  },
  updateReturn: (id, data) => {
    return request(`/api/returns/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }
};
