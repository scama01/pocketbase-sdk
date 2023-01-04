import { AuthData, AuthRecord, ReturnRecord } from "../types";
import {
  cookieParse,
  cookieSerialize,
  getTokenPayload,
  isTokenExpired,
  SerializeOptions,
} from "./utils";

const defaultCookieKey = "pb_auth";

export default class BaseAuth<T extends AuthRecord> {
  protected baseToken: string = "";
  protected baseRecord: T | null = null;

  private _onChangeCallbacks: Array<(data: AuthData<T>) => {}> = [];

  get token(): string {
    return this.baseToken;
  }

  get record(): T | null {
    return this.baseRecord;
  }

  /**
   * Check if the current user is still valid (based on the JWT token of the user).
   */
  get isValid(): boolean {
    return !isTokenExpired(this.token);
  }

  save(token: string, record: T | null): void {
    this.baseToken = token || "";

    if (record !== null && typeof record === "object") {
      this.baseRecord = record;
    } else {
      this.baseRecord = null;
    }

    this.triggerChange();
  }

  clear(): void {
    this.baseToken = "";
    this.baseRecord = null;
    this.triggerChange();
  }

  /**
   * Load user from the provided cookie string.
   * @param cookie - The cookie string.
   * @param key - The cookie key.
   */
  loadFromCookie(cookie: string, key = defaultCookieKey): void {
    const rawData = cookieParse(cookie || "")[key] || "";

    let data: Partial<AuthData<T>> = {};
    try {
      data = JSON.parse(rawData);
      if (
        typeof data === null ||
        typeof data !== "object" ||
        Array.isArray(data)
      ) {
        data = {};
      }
    } catch (_) {}

    this.save(data.token || "", (data.record as T) || null);
  }

  /**
   * Export the current user to a cookie.
   * @param options - Serializing options for the cookie
   * @param key - The cookie key.
   * @returns {string} The cookie string.
   */
  exportToCookie(options?: SerializeOptions, key = defaultCookieKey): string {
    const defaultOptions: SerializeOptions = {
      secure: true,
      sameSite: true,
      httpOnly: true,
      path: "/",
    };

    const payload = getTokenPayload(this.token);
    if (payload?.exp) {
      defaultOptions.expires = new Date(payload.exp * 1000);
    } else {
      defaultOptions.expires = new Date("1970-01-01");
    }

    options = Object.assign({}, defaultOptions, options);

    const rawData: {
      token: string;
      record: Partial<T>;
    } = {
      token: this.token,
      record: Object.assign({}, this.record) || null,
    };

    let result = cookieSerialize(key, JSON.stringify(rawData), options);

    const resultLength =
      typeof Blob !== "undefined" ? new Blob([result]).size : result.length;

    if (rawData.record && resultLength > 4096) {
      rawData.record = {
        id: rawData.record.id,
        email: rawData.record.email,
      } as Partial<T>;
      if (this.record !== null) {
        rawData.record.username = this.record.username;
        rawData.record.verified = this.record.verified;
        rawData.record.collectionId = this.record.collectionId;
      }
      result = cookieSerialize(key, JSON.stringify(rawData), options);
    }

    return result;
  }

  /**
   * Subscribe to auth changes with a callback function.
   * @param callback - The callback function
   * @param fireImmediately - If the function should be called immediately
   * @returns A function you can use to unsubscribe from changes.
   */
  onChange(
    callback: (data: Partial<AuthData<T>>) => any,
    fireImmediately = false
  ): () => void {
    this._onChangeCallbacks.push(callback);

    if (fireImmediately) {
      callback({ token: this.token, record: this.record as ReturnRecord<T> });
    }

    return () => {
      for (let i = this._onChangeCallbacks.length - 1; i >= 0; i--) {
        if (this._onChangeCallbacks[i] == callback) {
          delete this._onChangeCallbacks[i];
          this._onChangeCallbacks.splice(i, 1);
          return;
        }
      }
    };
  }

  protected triggerChange(): void {
    for (const callback of this._onChangeCallbacks) {
      callback &&
        callback({ token: this.token, record: this.record as ReturnRecord<T> });
    }
  }
}
