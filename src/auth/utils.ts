let atobPolyfill: Function;
if (typeof atob === "function") {
  atobPolyfill = atob;
} else {
  atobPolyfill = (input: any) => {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

    let str = String(input).replace(/=+$/, "");
    if (str.length % 4 == 1) {
      throw new Error(
        "'atob' failed: The string to be decoded is not correctly encoded."
      );
    }

    for (
      var bc = 0, bs, buffer, idx = 0, output = "";
      (buffer = str.charAt(idx++));
      ~buffer && ((bs = bc % 4 ? (bs as any) * 64 + buffer : buffer), bc++ % 4)
        ? (output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6))))
        : 0
    ) {
      buffer = chars.indexOf(buffer);
    }

    return output;
  };
}

export function getTokenPayload(token: string): { [key: string]: any } {
  if (token) {
    try {
      const encodedPayload = decodeURIComponent(
        atobPolyfill(token.split(".")[1])
          .split("")
          .map(function (c: string) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );

      return JSON.parse(encodedPayload) || {};
    } catch (e) {}
  }

  return {};
}

export function isTokenExpired(
  token: string,
  expirationThreshold = 0
): boolean {
  let payload = getTokenPayload(token);

  if (
    Object.keys(payload).length > 0 &&
    (!payload.exp || payload.exp - expirationThreshold > Date.now() / 1000)
  ) {
    return false;
  }

  return true;
}

const fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

export interface ParseOptions {
  decode?: (val: string) => string;
}

export function cookieParse(
  str: string,
  options?: ParseOptions
): { [key: string]: any } {
  const result: { [key: string]: any } = {};

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

    if (undefined === result[key]) {
      let val = str.slice(eqIdx + 1, endIdx).trim();

      if (val.charCodeAt(0) === 0x22) {
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

export interface SerializeOptions {
  encode?: (val: string | number | boolean) => string;
  maxAge?: number;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
  priority?: string;
  sameSite?: boolean | string;
}

export function cookieSerialize(
  name: string,
  val: string,
  options?: SerializeOptions
): string {
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
    const priority =
      typeof opt.priority === "string"
        ? opt.priority.toLowerCase()
        : opt.priority;

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
    const sameSite =
      typeof opt.sameSite === "string"
        ? opt.sameSite.toLowerCase()
        : opt.sameSite;

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

function defaultDecode(val: string): string {
  return val.indexOf("%") !== -1 ? decodeURIComponent(val) : val;
}

function defaultEncode(val: string | number | boolean): string {
  return encodeURIComponent(val);
}

function isDate(val: any): boolean {
  return (
    Object.prototype.toString.call(val) === "[object Date]" ||
    val instanceof Date
  );
}
