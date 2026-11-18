export interface ApiResponse {
  status: number;
  headers: Headers;
  data: unknown;
}

export class ApiHttpError extends Error {
  readonly response: ApiResponse;

  constructor(response: ApiResponse) {
    super(`Request failed with status code ${response.status}`);
    this.name = 'ApiHttpError';
    this.response = response;
  }
}
