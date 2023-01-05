'use strict';

var path = require('path-browserify');
var axios = require('axios');
var eventSourcePolyfill = require('event-source-polyfill');

function _interopNamespaceDefault(e) {
  var n = Object.create(null);
  if (e) {
    Object.keys(e).forEach(function (k) {
      if (k !== 'default') {
        var d = Object.getOwnPropertyDescriptor(e, k);
        Object.defineProperty(n, k, d.get ? d : {
          enumerable: true,
          get: function () { return e[k]; }
        });
      }
    });
  }
  n.default = e;
  return Object.freeze(n);
}

var path__namespace = /*#__PURE__*/_interopNamespaceDefault(path);

let atobPolyfill;
if (typeof atob === "function") {
  atobPolyfill = atob;
} else {
  atobPolyfill = (input) => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    let str = String(input).replace(/=+$/, "");
    if (str.length % 4 == 1) {
      throw new Error(
        "'atob' failed: The string to be decoded is not correctly encoded."
      );
    }
    for (var bc = 0, bs, buffer, idx = 0, output = ""; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
    }
    return output;
  };
}
function getTokenPayload(token) {
  if (token) {
    try {
      const encodedPayload = decodeURIComponent(
        atobPolyfill(token.split(".")[1]).split("").map(function(c) {
          return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
        }).join("")
      );
      return JSON.parse(encodedPayload) || {};
    } catch (e) {
    }
  }
  return {};
}
function isTokenExpired(token, expirationThreshold = 0) {
  let payload = getTokenPayload(token);
  if (Object.keys(payload).length > 0 && (!payload.exp || payload.exp - expirationThreshold > Date.now() / 1e3)) {
    return false;
  }
  return true;
}
const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;
function cookieParse(str, options) {
  const result = {};
  if (typeof str !== "string") {
    return result;
  }
  const opt = Object.assign({}, options || {});
  const decode = opt.decode || defaultDecode;
  let index = 0;
  while (index < str.length) {
    const eqIdx = str.indexOf("=", index);
    if (eqIdx === -1) {
      break;
    }
    let endIdx = str.indexOf(";", index);
    if (endIdx === -1) {
      endIdx = str.length;
    } else if (endIdx < eqIdx) {
      index = str.lastIndexOf(";", eqIdx - 1) + 1;
      continue;
    }
    const key = str.slice(index, eqIdx).trim();
    if (void 0 === result[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();
      if (val.charCodeAt(0) === 34) {
        val = val.slice(1, -1);
      }
      try {
        result[key] = decode(val);
      } catch (_) {
        result[key] = val;
      }
    }
    index = endIdx + 1;
  }
  return result;
}
function cookieSerialize(name, val, options) {
  const opt = Object.assign({}, options || {});
  const encode = opt.encode || defaultEncode;
  if (!fieldContentRegExp.test(name)) {
    throw new TypeError("argument name is invalid");
  }
  const value = encode(val);
  if (value && !fieldContentRegExp.test(value)) {
    throw new TypeError("argument val is invalid");
  }
  let result = name + "=" + value;
  if (opt.maxAge != null) {
    const maxAge = opt.maxAge - 0;
    if (isNaN(maxAge) || !isFinite(maxAge)) {
      throw new TypeError("option maxAge is invalid");
    }
    result += "; Max-Age=" + Math.floor(maxAge);
  }
  if (opt.domain) {
    if (!fieldContentRegExp.test(opt.domain)) {
      throw new TypeError("option domain is invalid");
    }
    result += "; Domain=" + opt.domain;
  }
  if (opt.path) {
    if (!fieldContentRegExp.test(opt.path)) {
      throw new TypeError("option path is invalid");
    }
    result += "; Path=" + opt.path;
  }
  if (opt.expires) {
    if (!isDate(opt.expires) || isNaN(opt.expires.valueOf())) {
      throw new TypeError("option expires is invalid");
    }
    result += "; Expires=" + opt.expires.toUTCString();
  }
  if (opt.httpOnly) {
    result += "; HttpOnly";
  }
  if (opt.secure) {
    result += "; Secure";
  }
  if (opt.priority) {
    const priority = typeof opt.priority === "string" ? opt.priority.toLowerCase() : opt.priority;
    switch (priority) {
      case "low":
        result += "; Priority=Low";
        break;
      case "medium":
        result += "; Priority=Medium";
        break;
      case "high":
        result += "; Priority=High";
        break;
      default:
        throw new TypeError("option priority is invalid");
    }
  }
  if (opt.sameSite) {
    const sameSite = typeof opt.sameSite === "string" ? opt.sameSite.toLowerCase() : opt.sameSite;
    switch (sameSite) {
      case true:
        result += "; SameSite=Strict";
        break;
      case "lax":
        result += "; SameSite=Lax";
        break;
      case "strict":
        result += "; SameSite=Strict";
        break;
      case "none":
        result += "; SameSite=None";
        break;
      default:
        throw new TypeError("option sameSite is invalid");
    }
  }
  return result;
}
function defaultDecode(val) {
  return val.indexOf("%") !== -1 ? decodeURIComponent(val) : val;
}
function defaultEncode(val) {
  return encodeURIComponent(val);
}
function isDate(val) {
  return Object.prototype.toString.call(val) === "[object Date]" || val instanceof Date;
}

const defaultCookieKey = "pb_auth";
class BaseAuth {
  baseToken = "";
  baseRecord = null;
  _onChangeCallbacks = [];
  get token() {
    return this.baseToken;
  }
  get record() {
    return this.baseRecord;
  }
  get isValid() {
    return !isTokenExpired(this.token);
  }
  save(token, record) {
    this.baseToken = token || "";
    if (record !== null && typeof record === "object") {
      this.baseRecord = record;
    } else {
      this.baseRecord = null;
    }
    this.triggerChange();
  }
  clear() {
    this.baseToken = "";
    this.baseRecord = null;
    this.triggerChange();
  }
  loadFromCookie(cookie, key = defaultCookieKey) {
    const rawData = cookieParse(cookie || "")[key] || "";
    let data = {};
    try {
      data = JSON.parse(rawData);
      if (typeof data === null || typeof data !== "object" || Array.isArray(data)) {
        data = {};
      }
    } catch (_) {
    }
    this.save(data.token || "", data.record || null);
  }
  exportToCookie(options, key = defaultCookieKey) {
    const defaultOptions = {
      secure: true,
      sameSite: true,
      httpOnly: true,
      path: "/"
    };
    const payload = getTokenPayload(this.token);
    if (payload?.exp) {
      defaultOptions.expires = new Date(payload.exp * 1e3);
    } else {
      defaultOptions.expires = new Date("1970-01-01");
    }
    options = Object.assign({}, defaultOptions, options);
    const rawData = {
      token: this.token,
      record: Object.assign({}, this.record) || null
    };
    let result = cookieSerialize(key, JSON.stringify(rawData), options);
    const resultLength = typeof Blob !== "undefined" ? new Blob([result]).size : result.length;
    if (rawData.record && resultLength > 4096) {
      rawData.record = {
        id: rawData.record.id,
        email: rawData.record.email
      };
      if (this.record !== null) {
        rawData.record.username = this.record.username;
        rawData.record.verified = this.record.verified;
        rawData.record.collectionId = this.record.collectionId;
      }
      result = cookieSerialize(key, JSON.stringify(rawData), options);
    }
    return result;
  }
  onChange(callback, fireImmediately = false) {
    this._onChangeCallbacks.push(callback);
    if (fireImmediately) {
      callback({ token: this.token, record: this.record });
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
  triggerChange() {
    for (const callback of this._onChangeCallbacks) {
      callback && callback({ token: this.token, record: this.record });
    }
  }
}

class Auth extends BaseAuth {
  storageFallback = {};
  storageKey;
  constructor(storageKey = "pocketbase_auth") {
    super();
    this.storageKey = storageKey;
  }
  get token() {
    const data = this._storageGet(this.storageKey) || {};
    return data.token || "";
  }
  get record() {
    const data = this._storageGet(this.storageKey) || {};
    if (data === null || typeof data !== "object" || data.record === null || typeof data.record !== "object") {
      return null;
    }
    return data.record;
  }
  save(token, record) {
    this._storageSet(this.storageKey, {
      token,
      record
    });
    super.save(token, record);
  }
  clear() {
    this._storageRemove(this.storageKey);
    super.clear();
  }
  _storageGet(key) {
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
  _storageSet(key, value) {
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
  _storageRemove(key) {
    if (typeof window !== "undefined" && window?.localStorage) {
      window.localStorage?.removeItem(key);
    }
    delete this.storageFallback[key];
  }
}

class RequestError extends Error {
  constructor(error) {
    super(error.message);
    this.name = "RequestError";
    this.cause = (error.response?.data).data;
  }
}

function setQuery(query, searchParams) {
  if (!query)
    return "";
  let { sort, expand, filter, page, perPage } = query;
  if (sort) {
    let sortQuery = Object.keys(sort).map(
      (key) => `${sort[key] === "+" ? "" : "-"}${key}`
    ).join(",");
    searchParams.append("sort", sortQuery);
  }
  if (expand) {
    searchParams.append("expand", expand.join(","));
  }
  if (filter) {
    searchParams.append("filter", `(${filter})`);
  }
  if (page || perPage) {
    searchParams.append("page", String(page));
    searchParams.append("perPage", String(perPage));
  } else {
    searchParams.append("page", "1");
    searchParams.append("perPage", String(999));
  }
}

class Collection {
  name;
  client;
  recordsUrl;
  constructor(client, name) {
    if (name.trim() === "")
      throw new Error("Name cannot be an empty string.");
    this.name = name;
    this.client = client;
    this.recordsUrl = path__namespace.join(
      client.apiURL,
      "/collections",
      name,
      "/records"
    );
  }
  async getList(query) {
    const apiURL = new URL(this.recordsUrl);
    setQuery(query, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      headers: {
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = await res.data;
    return data;
  }
  async get(id, expand) {
    const apiURL = new URL(path__namespace.join(this.recordsUrl, id));
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      headers: {
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = await res.data;
    return data;
  }
  async create(data, expand) {
    const apiURL = new URL(this.recordsUrl);
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      method: "POST",
      data,
      headers: {
        "Content-Type": data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data;
  }
  async update(id, data, expand) {
    const apiURL = new URL(path__namespace.join(this.recordsUrl, id));
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      method: "PATCH",
      data,
      headers: {
        "Content-Type": data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data;
  }
  async delete(id) {
    await axios({
      url: new URL(path__namespace.join(this.recordsUrl, id)).toString(),
      method: "DELETE",
      headers: {
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
  }
  async subscribe(topic, callback, keepAlive = false) {
    if (topic === "*") {
      return await this.client.realtime.subscribe(
        this.name,
        callback,
        keepAlive
      );
    } else {
      return await this.client.realtime.subscribe(
        path__namespace.join(this.name, topic),
        callback,
        keepAlive
      );
    }
  }
  async unsubscribe(topic, keepAlive = false) {
    if (typeof topic === "string") {
      if (topic === "*") {
        return await this.client.realtime.unsubscribe(this.name, keepAlive);
      } else {
        return await this.client.realtime.unsubscribe(
          path__namespace.join(this.name, topic),
          keepAlive
        );
      }
    } else if (typeof topic === "undefined") {
      return await this.client.realtime.unsubscribe(this.name, keepAlive, true);
    }
  }
}

class AuthCollection extends Collection {
  url;
  constructor(client, name) {
    super(client, name);
    this.url = path__namespace.join(client.apiURL, "/collections", name);
  }
  async create(data) {
    if (data instanceof FormData) {
      if (!data.get("passwordConfirm")) {
        data.set("passwordConfirm", data.get("password"));
      }
    } else {
      if (!data.passwordConfirm)
        data.passwordConfirm = data.password;
    }
    const res = await axios({
      url: this.recordsUrl,
      method: "POST",
      data,
      headers: {
        "Content-Type": data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data;
  }
  async update(id, data, expand) {
    const apiURL = new URL(path__namespace.join(this.recordsUrl, id));
    setQuery({ expand }, apiURL.searchParams);
    const res = await axios({
      url: apiURL.toString(),
      method: "PATCH",
      data,
      headers: {
        "Content-Type": data instanceof FormData ? "multipart/form-data" : "application/json",
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    return res.data;
  }
  async authWithPassword(identity, password) {
    const res = await axios({
      url: new URL(path__namespace.join(this.url, "auth-with-password")).toString(),
      method: "POST",
      data: {
        identity,
        password
      },
      headers: {
        "Content-Type": "application/json"
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = res.data;
    this.client.auth.save(data.token, data.record);
    return data;
  }
  async authRefresh() {
    const res = await axios({
      url: new URL(path__namespace.join(this.url, "auth-refresh")).toString(),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
    const data = res.data;
    this.client.auth.save(data.token, data.record);
    return data;
  }
}

const EventSource = eventSourcePolyfill.NativeEventSource || eventSourcePolyfill.EventSourcePolyfill;
class Realtime {
  client;
  realtimeInstance;
  clientID;
  subscribedTopics;
  subscribedCallbacks;
  constructor(client) {
    this.client = client;
    this.subscribedTopics = [];
    this.subscribedCallbacks = [];
  }
  async updateTopics() {
    await axios({
      url: new URL(path__namespace.join(this.client.apiURL, "realtime")).toString(),
      method: "POST",
      data: {
        clientId: this.clientID,
        subscriptions: this.subscribedTopics
      },
      headers: {
        Authorization: this.client.auth.token
      }
    }).catch((err) => {
      throw new RequestError(err);
    });
  }
  async removeTopic(topic, matching = false) {
    this.subscribedTopics = this.subscribedTopics.filter((value) => {
      if (matching) {
        return !new RegExp(`^${topic}/?([a-zA-Z0-9_-]+)?`, "g").test(value);
      } else {
        return value !== topic;
      }
    });
    this.subscribedCallbacks.filter((value) => {
      if (matching) {
        return new RegExp(`^${topic}/?([a-zA-Z0-9_-]+)?`, "g").test(
          value.topic
        );
      } else {
        return value.topic === topic;
      }
    }).forEach((listener) => {
      this.realtimeInstance?.removeEventListener(
        listener.topic,
        listener.callback
      );
    });
    this.subscribedCallbacks = this.subscribedCallbacks.filter((value) => {
      if (matching) {
        return !new RegExp(`^${topic}/?([a-zA-Z0-9_-]+)?`, "g").test(
          value.topic
        );
      } else {
        return value.topic !== topic;
      }
    });
  }
  async unsubscribeByTopicAndListener(topic, listener, keepAlive = false) {
    this.realtimeInstance?.removeEventListener(topic, listener);
    this.subscribedCallbacks = this.subscribedCallbacks.filter((value) => {
      return value.callback !== listener;
    });
    if (this.subscribedCallbacks.filter((value) => {
      value.topic === topic;
    }).length === 0) {
      this.subscribedTopics = this.subscribedTopics.filter(
        (value) => value !== topic
      );
    }
    if (this.subscribedCallbacks.length === 0 && !keepAlive)
      this.disconnect();
  }
  async initialize() {
    await new Promise((resolve) => {
      this.realtimeInstance = new EventSource(
        new URL(path__namespace.join(this.client.apiURL, "realtime")).toString()
      );
      this.realtimeInstance.addEventListener("PB_CONNECT", async (data) => {
        this.clientID = JSON.parse(data.data).clientId;
        await this.updateTopics();
        resolve();
      });
    });
  }
  disconnect() {
    this.realtimeInstance?.close();
    this.realtimeInstance = void 0;
    this.clientID = void 0;
    this.subscribedCallbacks = [];
    this.subscribedTopics = [];
  }
  async subscribe(topic, callback, keepAlive = false) {
    if (!this.realtimeInstance) {
      await this.initialize();
    }
    if (!this.subscribedTopics.includes(topic)) {
      this.subscribedTopics.push(topic);
    }
    await this.updateTopics();
    const listener = (data) => {
      callback(JSON.parse(data.data));
    };
    this.subscribedCallbacks.push({
      topic,
      callback: listener
    });
    this.realtimeInstance?.addEventListener(topic, listener);
    return async () => {
      await this.unsubscribeByTopicAndListener(topic, listener, keepAlive);
    };
  }
  async unsubscribe(topics, keepAlive = false, matching = false) {
    if (typeof topics === "undefined" || topics === "" || topics === "*") {
      this.subscribedCallbacks = [];
      this.subscribedTopics = [];
    } else if (typeof topics === "string") {
      await this.removeTopic(topics, matching);
    } else if (Array.isArray(topics)) {
      for (let topic in topics) {
        await this.removeTopic(topic, matching);
      }
    }
    await this.updateTopics();
    if (this.subscribedCallbacks.length === 0 && !keepAlive)
      this.disconnect();
  }
}

class Client {
  baseURL;
  apiURL;
  auth;
  realtime;
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.apiURL = path__namespace.join(baseURL, "api");
    this.auth = new Auth();
    this.realtime = new Realtime(this);
  }
  collection(name) {
    return new Collection(this, name);
  }
  authCollection(name) {
    return new AuthCollection(this, name);
  }
}

exports.AuthCollection = AuthCollection;
exports.Client = Client;
exports.Collection = Collection;
//# sourceMappingURL=pocketbase.js.map
