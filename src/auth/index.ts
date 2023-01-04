import { AuthRecord } from "../types";
import BaseAuth from "./base";

export default class Auth<T extends AuthRecord> extends BaseAuth<T> {
  private storageFallback: { [key: string]: any } = {};
  private storageKey: string;

  /**
   * New local auth instance.
   * @constructor
   */
  constructor(storageKey = "pocketbase_auth") {
    super();

    this.storageKey = storageKey;
  }

  /**
   * JWT of the current logged in user (returns empty string if not logged in).
   * @readonly
   */
  get token(): string {
    const data = this._storageGet(this.storageKey) || {};

    return data.token || "";
  }

  /**
   * Record of the current logged user (returns null if not logged in).
   * @readonly
   */
  get record(): T | null {
    const data = this._storageGet(this.storageKey) || {};

    if (
      data === null ||
      typeof data !== "object" ||
      data.record === null ||
      typeof data.record !== "object"
    ) {
      return null;
    }

    return data.record;
  }

  /**
   * Save new user in local storage.
   * @param token - JWT token of the user.
   * @param record - The user record.
   */
  save(token: string, record: T | null) {
    this._storageSet(this.storageKey, {
      token: token,
      record: record,
    });

    super.save(token, record);
  }

  /**
   * Clear the current user from local storage (or log out).
   */
  clear() {
    this._storageRemove(this.storageKey);

    super.clear();
  }

  private _storageGet(key: string): any {
    if (typeof window !== "undefined" && window?.localStorage) {
      const rawValue = window.localStorage.getItem(key) || "";
      try {
        return JSON.parse(rawValue);
      } catch (e) {
        return rawValue;
      }
    }
    return this.storageFallback[key];
  }

  private _storageSet(key: string, value: any) {
    if (typeof window !== "undefined" && window?.localStorage) {
      let normalizedVal = value;
      if (typeof value !== "string") {
        normalizedVal = JSON.stringify(value);
      }
      window.localStorage.setItem(key, normalizedVal);
    } else {
      this.storageFallback[key] = value;
    }
  }

  private _storageRemove(key: string) {
    if (typeof window !== "undefined" && window?.localStorage) {
      window.localStorage?.removeItem(key);
    }

    delete this.storageFallback[key];
  }
}
