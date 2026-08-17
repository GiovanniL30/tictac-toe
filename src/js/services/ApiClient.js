export class ApiClient {
  constructor(baseUrl = "") {
    this.baseUrl = baseUrl;
  }

  async request(path, options = {}) {
    const url = `${this.baseUrl}${path}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(
        `API Error: ${response.status} ${response.statusText}`,
      );

      error.status = response.status;

      throw error;
    }

    return this.parseResponse(response);
  }

  async parseResponse(response) {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      return response.json();
    }

    return response.text();
  }

  get(path, options = {}) {
    return this.request(path, {
      ...options,
      method: "GET",
    });
  }
}
