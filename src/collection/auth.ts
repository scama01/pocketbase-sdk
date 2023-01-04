import axios from "axios";
import * as path from "path";
import Collection from ".";
import Client from "../client";
import {
  AuthCreateParams,
  AuthData,
  AuthRecord,
  AuthUpdateParams,
  Expand,
  ReturnRecord,
} from "../types";
import { RequestError } from "../utils";
import { setQuery } from "./utils";

export default class AuthCollection<
  T extends AuthRecord
> extends Collection<T> {
  protected readonly url: string;

  /**
   * Instance of an auth collection from the database.
   * @constructor
   * @param {Client<any>} client - The PocketBase Client instance.
   * @param {string} name - The name of the collection.
   */
  constructor(client: Client<any>, name: string) {
    super(client, name);
    this.url = path.join(client.apiURL, "/collections", name);
  }

  /**
   * Create an user in the collection.
   * @async
   * @param data - The data for the user in `JSON` of `FormData` format.
   * @returns The user created.
   */
  async create(data: AuthCreateParams<T> | FormData) {
    if (data instanceof FormData) {
      if (!data.get("passwordConfirm")) {
        data.set("passwordConfirm", data.get("password")!);
      }
    } else {
      if (!data.passwordConfirm) data.passwordConfirm = data.password;
    }
    const res = await axios({
      url: this.recordsUrl,
      method: "POST",
      data: data,
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data as ReturnRecord<T>;
  }

  async update(
    id: string,
    data: FormData | AuthUpdateParams<T>,
    expand?: Expand<T>
  ) {
    const apiURL = new URL(path.join(this.recordsUrl, id));
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      method: "PATCH",
      data: data,
      headers: {
        "Content-Type":
          data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data as ReturnRecord<T>;
  }

  /**
   * Authenticate using password.
   * @async
   * @param identity - The identity of the user (username or email).
   * @param password - The password of the user.
   * @returns The token and record of the user.
   */
  async authWithPassword(identity: string, password: string) {
    const res = await axios({
      url: path.join(this.url, "auth-with-password"),
      method: "POST",
      data: {
        identity,
        password,
      },
      headers: {
        "Content-Type": "application/json",
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = res.data as AuthData<T>;
    this.client.auth.save(data.token, data.record);
    return data;
  }

  /**
   * Refreshes the token and record of the current user.
   * @async
   * @returns The updated token and record of the user.
   */
  async authRefresh() {
    const res = await axios({
      url: path.join(this.url, "auth-refresh"),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.client.auth.token,
      },
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = res.data as AuthData<T>;
    this.client.auth.save(data.token, data.record);
    return data;
  }
}
