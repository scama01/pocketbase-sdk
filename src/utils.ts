import { AxiosError } from "axios";

export class RequestError extends Error {
  constructor(error: AxiosError) {
    super(error.message);
    this.name = "RequestError";
    this.cause = (error.response?.data as any).data;
  }
}
