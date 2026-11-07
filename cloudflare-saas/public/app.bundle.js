// cloudflare-saas/vendor/firebase-13.2.0/firebase-app.js
/**
 * @license
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var getDefaultsFromPostinstall = () => void 0;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var stringToByteArray$1 = function(str) {
  const out = [];
  let p = 0;
  for (let i = 0; i < str.length; i++) {
    let c2 = str.charCodeAt(i);
    if (c2 < 128) {
      out[p++] = c2;
    } else if (c2 < 2048) {
      out[p++] = c2 >> 6 | 192;
      out[p++] = c2 & 63 | 128;
    } else if ((c2 & 64512) === 55296 && i + 1 < str.length && (str.charCodeAt(i + 1) & 64512) === 56320) {
      c2 = 65536 + ((c2 & 1023) << 10) + (str.charCodeAt(++i) & 1023);
      out[p++] = c2 >> 18 | 240;
      out[p++] = c2 >> 12 & 63 | 128;
      out[p++] = c2 >> 6 & 63 | 128;
      out[p++] = c2 & 63 | 128;
    } else {
      out[p++] = c2 >> 12 | 224;
      out[p++] = c2 >> 6 & 63 | 128;
      out[p++] = c2 & 63 | 128;
    }
  }
  return out;
};
var byteArrayToString = function(bytes) {
  const out = [];
  let pos = 0, c2 = 0;
  while (pos < bytes.length) {
    const c1 = bytes[pos++];
    if (c1 < 128) {
      out[c2++] = String.fromCharCode(c1);
    } else if (c1 > 191 && c1 < 224) {
      const c22 = bytes[pos++];
      out[c2++] = String.fromCharCode((c1 & 31) << 6 | c22 & 63);
    } else if (c1 > 239 && c1 < 365) {
      const c22 = bytes[pos++];
      const c3 = bytes[pos++];
      const c4 = bytes[pos++];
      const u2 = ((c1 & 7) << 18 | (c22 & 63) << 12 | (c3 & 63) << 6 | c4 & 63) - 65536;
      out[c2++] = String.fromCharCode(55296 + (u2 >> 10));
      out[c2++] = String.fromCharCode(56320 + (u2 & 1023));
    } else {
      const c22 = bytes[pos++];
      const c3 = bytes[pos++];
      out[c2++] = String.fromCharCode((c1 & 15) << 12 | (c22 & 63) << 6 | c3 & 63);
    }
  }
  return out.join("");
};
var base64 = {
  /**
   * Maps bytes to characters.
   */
  byteToCharMap_: null,
  /**
   * Maps characters to bytes.
   */
  charToByteMap_: null,
  /**
   * Maps bytes to websafe characters.
   * @private
   */
  byteToCharMapWebSafe_: null,
  /**
   * Maps websafe characters to bytes.
   * @private
   */
  charToByteMapWebSafe_: null,
  /**
   * Our default alphabet, shared between
   * ENCODED_VALS and ENCODED_VALS_WEBSAFE
   */
  ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  /**
   * Our default alphabet. Value 64 (=) is special; it means "nothing."
   */
  get ENCODED_VALS() {
    return this.ENCODED_VALS_BASE + "+/=";
  },
  /**
   * Our websafe alphabet.
   */
  get ENCODED_VALS_WEBSAFE() {
    return this.ENCODED_VALS_BASE + "-_.";
  },
  /**
   * Whether this browser supports the atob and btoa functions. This extension
   * started at Mozilla but is now implemented by many browsers. We use the
   * ASSUME_* variables to avoid pulling in the full useragent detection library
   * but still allowing the standard per-browser compilations.
   *
   */
  HAS_NATIVE_SUPPORT: typeof atob === "function",
  /**
   * Base64-encode an array of bytes.
   *
   * @param input An array of bytes (numbers with
   *     value in [0, 255]) to encode.
   * @param webSafe Boolean indicating we should use the
   *     alternative alphabet.
   * @return The base64 encoded string.
   */
  encodeByteArray(input, webSafe) {
    if (!Array.isArray(input)) {
      throw Error("encodeByteArray takes an array as a parameter");
    }
    this.init_();
    const byteToCharMap = webSafe ? this.byteToCharMapWebSafe_ : this.byteToCharMap_;
    const output = [];
    for (let i = 0; i < input.length; i += 3) {
      const byte1 = input[i];
      const haveByte2 = i + 1 < input.length;
      const byte2 = haveByte2 ? input[i + 1] : 0;
      const haveByte3 = i + 2 < input.length;
      const byte3 = haveByte3 ? input[i + 2] : 0;
      const outByte1 = byte1 >> 2;
      const outByte2 = (byte1 & 3) << 4 | byte2 >> 4;
      let outByte3 = (byte2 & 15) << 2 | byte3 >> 6;
      let outByte4 = byte3 & 63;
      if (!haveByte3) {
        outByte4 = 64;
        if (!haveByte2) {
          outByte3 = 64;
        }
      }
      output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
    }
    return output.join("");
  },
  /**
   * Base64-encode a string.
   *
   * @param input A string to encode.
   * @param webSafe If true, we should use the
   *     alternative alphabet.
   * @return The base64 encoded string.
   */
  encodeString(input, webSafe) {
    if (this.HAS_NATIVE_SUPPORT && !webSafe) {
      return btoa(input);
    }
    return this.encodeByteArray(stringToByteArray$1(input), webSafe);
  },
  /**
   * Base64-decode a string.
   *
   * @param input to decode.
   * @param webSafe True if we should use the
   *     alternative alphabet.
   * @return string representing the decoded value.
   */
  decodeString(input, webSafe) {
    if (this.HAS_NATIVE_SUPPORT && !webSafe) {
      return atob(input);
    }
    return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
  },
  /**
   * Base64-decode a string.
   *
   * In base-64 decoding, groups of four characters are converted into three
   * bytes.  If the encoder did not apply padding, the input length may not
   * be a multiple of 4.
   *
   * In this case, the last group will have fewer than 4 characters, and
   * padding will be inferred.  If the group has one or two characters, it decodes
   * to one byte.  If the group has three characters, it decodes to two bytes.
   *
   * @param input Input to decode.
   * @param webSafe True if we should use the web-safe alphabet.
   * @return bytes representing the decoded value.
   */
  decodeStringToByteArray(input, webSafe) {
    this.init_();
    const charToByteMap = webSafe ? this.charToByteMapWebSafe_ : this.charToByteMap_;
    const output = [];
    for (let i = 0; i < input.length; ) {
      const byte1 = charToByteMap[input.charAt(i++)];
      const haveByte2 = i < input.length;
      const byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
      ++i;
      const haveByte3 = i < input.length;
      const byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
      ++i;
      const haveByte4 = i < input.length;
      const byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
      ++i;
      if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
        throw new DecodeBase64StringError();
      }
      const outByte1 = byte1 << 2 | byte2 >> 4;
      output.push(outByte1);
      if (byte3 !== 64) {
        const outByte2 = byte2 << 4 & 240 | byte3 >> 2;
        output.push(outByte2);
        if (byte4 !== 64) {
          const outByte3 = byte3 << 6 & 192 | byte4;
          output.push(outByte3);
        }
      }
    }
    return output;
  },
  /**
   * Lazy static initialization function. Called before
   * accessing any of the static map variables.
   * @private
   */
  init_() {
    if (!this.byteToCharMap_) {
      this.byteToCharMap_ = {};
      this.charToByteMap_ = {};
      this.byteToCharMapWebSafe_ = {};
      this.charToByteMapWebSafe_ = {};
      for (let i = 0; i < this.ENCODED_VALS.length; i++) {
        this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
        this.charToByteMap_[this.byteToCharMap_[i]] = i;
        this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
        this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
        if (i >= this.ENCODED_VALS_BASE.length) {
          this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
          this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
        }
      }
    }
  }
};
var DecodeBase64StringError = class extends Error {
  constructor() {
    super(...arguments);
    this.name = "DecodeBase64StringError";
  }
};
var base64Encode = function(str) {
  const utf8Bytes = stringToByteArray$1(str);
  return base64.encodeByteArray(utf8Bytes, true);
};
var base64urlEncodeWithoutPadding = function(str) {
  return base64Encode(str).replace(/\./g, "");
};
var base64Decode = function(str) {
  try {
    return base64.decodeString(str, true);
  } catch (e) {
    console.error("base64Decode failed: ", e);
  }
  return null;
};
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getGlobal() {
  if (typeof self !== "undefined") {
    return self;
  }
  if (typeof window !== "undefined") {
    return window;
  }
  if (typeof global !== "undefined") {
    return global;
  }
  throw new Error("Unable to locate global object.");
}
/**
 * @license
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var getDefaultsFromGlobal = () => getGlobal().__FIREBASE_DEFAULTS__;
var getDefaultsFromEnvVariable = () => {
  if (typeof process === "undefined" || typeof process.env === "undefined") {
    return;
  }
  const defaultsJsonString = process.env.__FIREBASE_DEFAULTS__;
  if (defaultsJsonString) {
    return JSON.parse(defaultsJsonString);
  }
};
var getDefaultsFromCookie = () => {
  if (typeof document === "undefined") {
    return;
  }
  let match;
  try {
    match = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
  } catch (e) {
    return;
  }
  const decoded = match && base64Decode(match[1]);
  return decoded && JSON.parse(decoded);
};
var getDefaults = () => {
  try {
    return getDefaultsFromPostinstall() || getDefaultsFromGlobal() || getDefaultsFromEnvVariable() || getDefaultsFromCookie();
  } catch (e) {
    console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
    return;
  }
};
var getDefaultAppConfig = () => getDefaults()?.config;
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Deferred = class {
  constructor() {
    this.reject = () => {
    };
    this.resolve = () => {
    };
    this.promise = new Promise((resolve, reject) => {
      this.resolve = resolve;
      this.reject = reject;
    });
  }
  /**
   * Our API internals are not promisified and cannot because our callback APIs have subtle expectations around
   * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
   * and returns a node-style callback which will resolve or reject the Deferred's promise.
   */
  wrapCallback(callback) {
    return (error, value) => {
      if (error) {
        this.reject(error);
      } else {
        this.resolve(value);
      }
      if (typeof callback === "function") {
        this.promise.catch(() => {
        });
        if (callback.length === 1) {
          callback(error);
        } else {
          callback(error, value);
        }
      }
    };
  }
};
function isIndexedDBAvailable() {
  try {
    return typeof indexedDB === "object";
  } catch (e) {
    return false;
  }
}
function validateIndexedDBOpenable() {
  return new Promise((resolve, reject) => {
    try {
      let preExist = true;
      const DB_CHECK_NAME = "validate-browser-context-for-indexeddb-analytics-module";
      const request = self.indexedDB.open(DB_CHECK_NAME);
      request.onsuccess = () => {
        request.result.close();
        if (!preExist) {
          self.indexedDB.deleteDatabase(DB_CHECK_NAME);
        }
        resolve(true);
      };
      request.onupgradeneeded = () => {
        preExist = false;
      };
      request.onerror = () => {
        reject(request.error?.message || "");
      };
    } catch (error) {
      reject(error);
    }
  });
}
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ERROR_NAME = "FirebaseError";
var FirebaseError = class _FirebaseError extends Error {
  constructor(code, message, customData) {
    super(message);
    this.code = code;
    this.customData = customData;
    this.name = ERROR_NAME;
    Object.setPrototypeOf(this, _FirebaseError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ErrorFactory.prototype.create);
    }
  }
};
var ErrorFactory = class {
  constructor(service, serviceName, errors) {
    this.service = service;
    this.serviceName = serviceName;
    this.errors = errors;
  }
  create(code, ...data) {
    const customData = data[0] || {};
    const fullCode = `${this.service}/${code}`;
    const template = this.errors[code];
    const message = template ? replaceTemplate(template, customData) : "Error";
    const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
    const error = new FirebaseError(fullCode, fullMessage, customData);
    return error;
  }
};
function replaceTemplate(template, data) {
  try {
    let ptr = 0;
    let result = "";
    while (ptr < template.length) {
      const start2 = template.indexOf("{$", ptr);
      if (start2 === -1) {
        result += template.substring(ptr);
        break;
      }
      const end = template.indexOf("}", start2 + 2);
      if (end === -1) {
        result += template.substring(ptr);
        break;
      }
      const key = template.substring(start2 + 2, end);
      const value = data[key];
      result += template.substring(ptr, start2) + (value != null ? String(value) : `<${key}?>`);
      ptr = end + 1;
    }
    return result;
  } catch (e) {
    return template;
  }
}
function deepEqual(a2, b2) {
  if (a2 === b2) {
    return true;
  }
  const aKeys = Object.keys(a2);
  const bKeys = Object.keys(b2);
  for (const k of aKeys) {
    if (!bKeys.includes(k)) {
      return false;
    }
    const aProp = a2[k];
    const bProp = b2[k];
    if (isObject(aProp) && isObject(bProp)) {
      if (!deepEqual(aProp, bProp)) {
        return false;
      }
    } else if (aProp !== bProp) {
      return false;
    }
  }
  for (const k of bKeys) {
    if (!aKeys.includes(k)) {
      return false;
    }
  }
  return true;
}
function isObject(thing) {
  return thing !== null && typeof thing === "object";
}
var Component = class {
  /**
   *
   * @param name The public service name, e.g. app, auth, firestore, database
   * @param instanceFactory Service factory responsible for creating the public interface
   * @param type whether the service provided by the component is public or private
   */
  constructor(name2, instanceFactory, type) {
    this.name = name2;
    this.instanceFactory = instanceFactory;
    this.type = type;
    this.multipleInstances = false;
    this.serviceProps = {};
    this.instantiationMode = "LAZY";
    this.onInstanceCreated = null;
  }
  setInstantiationMode(mode) {
    this.instantiationMode = mode;
    return this;
  }
  setMultipleInstances(multipleInstances) {
    this.multipleInstances = multipleInstances;
    return this;
  }
  setServiceProps(props) {
    this.serviceProps = props;
    return this;
  }
  setInstanceCreatedCallback(callback) {
    this.onInstanceCreated = callback;
    return this;
  }
};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_ENTRY_NAME$1 = "[DEFAULT]";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Provider = class {
  constructor(name2, container) {
    this.name = name2;
    this.container = container;
    this.component = null;
    this.instances = /* @__PURE__ */ new Map();
    this.instancesDeferred = /* @__PURE__ */ new Map();
    this.instancesOptions = /* @__PURE__ */ new Map();
    this.onInitCallbacks = /* @__PURE__ */ new Map();
  }
  /**
   * @param identifier A provider can provide multiple instances of a service
   * if this.component.multipleInstances is true.
   */
  get(identifier) {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
    if (!this.instancesDeferred.has(normalizedIdentifier)) {
      const deferred = new Deferred();
      this.instancesDeferred.set(normalizedIdentifier, deferred);
      if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
        try {
          const instance = this.getOrInitializeService({
            instanceIdentifier: normalizedIdentifier
          });
          if (instance) {
            deferred.resolve(instance);
          }
        } catch (e) {
        }
      }
    }
    return this.instancesDeferred.get(normalizedIdentifier).promise;
  }
  getImmediate(options) {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(options?.identifier);
    const optional = options?.optional ?? false;
    if (this.isInitialized(normalizedIdentifier) || this.shouldAutoInitialize()) {
      try {
        return this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier
        });
      } catch (e) {
        if (optional) {
          return null;
        } else {
          throw e;
        }
      }
    } else {
      if (optional) {
        return null;
      } else {
        throw Error(`Service ${this.name} is not available`);
      }
    }
  }
  getComponent() {
    return this.component;
  }
  setComponent(component) {
    if (component.name !== this.name) {
      throw Error(`Mismatching Component ${component.name} for Provider ${this.name}.`);
    }
    if (this.component) {
      throw Error(`Component for ${this.name} has already been provided`);
    }
    this.component = component;
    if (!this.shouldAutoInitialize()) {
      return;
    }
    if (isComponentEager(component)) {
      try {
        this.getOrInitializeService({ instanceIdentifier: DEFAULT_ENTRY_NAME$1 });
      } catch (e) {
      }
    }
    for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
      const normalizedIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
      try {
        const instance = this.getOrInitializeService({
          instanceIdentifier: normalizedIdentifier
        });
        instanceDeferred.resolve(instance);
      } catch (e) {
      }
    }
  }
  clearInstance(identifier = DEFAULT_ENTRY_NAME$1) {
    this.instancesDeferred.delete(identifier);
    this.instancesOptions.delete(identifier);
    this.instances.delete(identifier);
  }
  // app.delete() will call this method on every provider to delete the services
  // TODO: should we mark the provider as deleted?
  async delete() {
    const services = Array.from(this.instances.values());
    await Promise.all([
      ...services.filter((service) => "INTERNAL" in service).map((service) => service.INTERNAL.delete()),
      ...services.filter((service) => "_delete" in service).map((service) => service._delete())
    ]);
  }
  isComponentSet() {
    return this.component != null;
  }
  isInitialized(identifier = DEFAULT_ENTRY_NAME$1) {
    return this.instances.has(identifier);
  }
  getOptions(identifier = DEFAULT_ENTRY_NAME$1) {
    return this.instancesOptions.get(identifier) || {};
  }
  initialize(opts = {}) {
    const { options = {} } = opts;
    const normalizedIdentifier = this.normalizeInstanceIdentifier(opts.instanceIdentifier);
    if (this.isInitialized(normalizedIdentifier)) {
      throw Error(`${this.name}(${normalizedIdentifier}) has already been initialized`);
    }
    if (!this.isComponentSet()) {
      throw Error(`Component ${this.name} has not been registered yet`);
    }
    const instance = this.getOrInitializeService({
      instanceIdentifier: normalizedIdentifier,
      options
    });
    for (const [instanceIdentifier, instanceDeferred] of this.instancesDeferred.entries()) {
      const normalizedDeferredIdentifier = this.normalizeInstanceIdentifier(instanceIdentifier);
      if (normalizedIdentifier === normalizedDeferredIdentifier) {
        instanceDeferred.resolve(instance);
      }
    }
    return instance;
  }
  /**
   *
   * @param callback - a function that will be invoked  after the provider has been initialized by calling provider.initialize().
   * The function is invoked SYNCHRONOUSLY, so it should not execute any longrunning tasks in order to not block the program.
   *
   * @param identifier An optional instance identifier
   * @returns a function to unregister the callback
   */
  onInit(callback, identifier) {
    const normalizedIdentifier = this.normalizeInstanceIdentifier(identifier);
    const existingCallbacks = this.onInitCallbacks.get(normalizedIdentifier) ?? /* @__PURE__ */ new Set();
    existingCallbacks.add(callback);
    this.onInitCallbacks.set(normalizedIdentifier, existingCallbacks);
    const existingInstance = this.instances.get(normalizedIdentifier);
    if (existingInstance) {
      callback(existingInstance, normalizedIdentifier);
    }
    return () => {
      existingCallbacks.delete(callback);
    };
  }
  /**
   * Invoke onInit callbacks synchronously
   * @param instance the service instance`
   */
  invokeOnInitCallbacks(instance, identifier) {
    const callbacks = this.onInitCallbacks.get(identifier);
    if (!callbacks) {
      return;
    }
    for (const callback of callbacks) {
      try {
        callback(instance, identifier);
      } catch {
      }
    }
  }
  getOrInitializeService({ instanceIdentifier, options = {} }) {
    let instance = this.instances.get(instanceIdentifier);
    if (!instance && this.component) {
      instance = this.component.instanceFactory(this.container, {
        instanceIdentifier: normalizeIdentifierForFactory(instanceIdentifier),
        options
      });
      this.instances.set(instanceIdentifier, instance);
      this.instancesOptions.set(instanceIdentifier, options);
      this.invokeOnInitCallbacks(instance, instanceIdentifier);
      if (this.component.onInstanceCreated) {
        try {
          this.component.onInstanceCreated(this.container, instanceIdentifier, instance);
        } catch {
        }
      }
    }
    return instance || null;
  }
  normalizeInstanceIdentifier(identifier = DEFAULT_ENTRY_NAME$1) {
    if (this.component) {
      return this.component.multipleInstances ? identifier : DEFAULT_ENTRY_NAME$1;
    } else {
      return identifier;
    }
  }
  shouldAutoInitialize() {
    return !!this.component && this.component.instantiationMode !== "EXPLICIT";
  }
};
function normalizeIdentifierForFactory(identifier) {
  return identifier === DEFAULT_ENTRY_NAME$1 ? void 0 : identifier;
}
function isComponentEager(component) {
  return component.instantiationMode === "EAGER";
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ComponentContainer = class {
  constructor(name2) {
    this.name = name2;
    this.providers = /* @__PURE__ */ new Map();
  }
  /**
   *
   * @param component Component being added
   * @param overwrite When a component with the same name has already been registered,
   * if overwrite is true: overwrite the existing component with the new component and create a new
   * provider with the new component. It can be useful in tests where you want to use different mocks
   * for different tests.
   * if overwrite is false: throw an exception
   */
  addComponent(component) {
    const provider = this.getProvider(component.name);
    if (provider.isComponentSet()) {
      throw new Error(`Component ${component.name} has already been registered with ${this.name}`);
    }
    provider.setComponent(component);
  }
  addOrOverwriteComponent(component) {
    const provider = this.getProvider(component.name);
    if (provider.isComponentSet()) {
      this.providers.delete(component.name);
    }
    this.addComponent(component);
  }
  /**
   * getProvider provides a type safe interface where it can only be called with a field name
   * present in NameServiceMapping interface.
   *
   * Firebase SDKs providing services should extend NameServiceMapping interface to register
   * themselves.
   */
  getProvider(name2) {
    if (this.providers.has(name2)) {
      return this.providers.get(name2);
    }
    const provider = new Provider(name2, this);
    this.providers.set(name2, provider);
    return provider;
  }
  getProviders() {
    return Array.from(this.providers.values());
  }
};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var InstantiationMode;
(function(InstantiationMode2) {
  InstantiationMode2["LAZY"] = "LAZY";
  InstantiationMode2["EAGER"] = "EAGER";
  InstantiationMode2["EXPLICIT"] = "EXPLICIT";
})(InstantiationMode || (InstantiationMode = {}));
var ComponentType;
(function(ComponentType2) {
  ComponentType2["PUBLIC"] = "PUBLIC";
  ComponentType2["PRIVATE"] = "PRIVATE";
  ComponentType2["VERSION"] = "VERSION";
})(ComponentType || (ComponentType = {}));
/**
 * @license
 * Copyright 2017 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var instances = [];
var LogLevel;
(function(LogLevel2) {
  LogLevel2[LogLevel2["DEBUG"] = 0] = "DEBUG";
  LogLevel2[LogLevel2["VERBOSE"] = 1] = "VERBOSE";
  LogLevel2[LogLevel2["INFO"] = 2] = "INFO";
  LogLevel2[LogLevel2["WARN"] = 3] = "WARN";
  LogLevel2[LogLevel2["ERROR"] = 4] = "ERROR";
  LogLevel2[LogLevel2["SILENT"] = 5] = "SILENT";
})(LogLevel || (LogLevel = {}));
var levelStringToEnum = {
  "debug": LogLevel.DEBUG,
  "verbose": LogLevel.VERBOSE,
  "info": LogLevel.INFO,
  "warn": LogLevel.WARN,
  "error": LogLevel.ERROR,
  "silent": LogLevel.SILENT
};
var defaultLogLevel = LogLevel.INFO;
var ConsoleMethod = {
  [LogLevel.DEBUG]: "log",
  [LogLevel.VERBOSE]: "log",
  [LogLevel.INFO]: "info",
  [LogLevel.WARN]: "warn",
  [LogLevel.ERROR]: "error"
};
var defaultLogHandler = (instance, logType, ...args) => {
  if (logType < instance.logLevel) {
    return;
  }
  const now = (/* @__PURE__ */ new Date()).toISOString();
  const method = ConsoleMethod[logType];
  if (method) {
    console[method](`[${now}]  ${instance.name}:`, ...args);
  } else {
    throw new Error(`Attempted to log a message with an invalid logType (value: ${logType})`);
  }
};
var Logger = class {
  /**
   * Gives you an instance of a Logger to capture messages according to
   * Firebase's logging scheme.
   *
   * @param name The name that the logs will be associated with
   */
  constructor(name2) {
    this.name = name2;
    this._logLevel = defaultLogLevel;
    this._logHandler = defaultLogHandler;
    this._userLogHandler = null;
    instances.push(this);
  }
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(val) {
    if (!(val in LogLevel)) {
      throw new TypeError(`Invalid value "${val}" assigned to \`logLevel\``);
    }
    this._logLevel = val;
  }
  // Workaround for setter/getter having to be the same type.
  setLogLevel(val) {
    this._logLevel = typeof val === "string" ? levelStringToEnum[val] : val;
  }
  get logHandler() {
    return this._logHandler;
  }
  set logHandler(val) {
    if (typeof val !== "function") {
      throw new TypeError("Value assigned to `logHandler` must be a function");
    }
    this._logHandler = val;
  }
  get userLogHandler() {
    return this._userLogHandler;
  }
  set userLogHandler(val) {
    this._userLogHandler = val;
  }
  /**
   * The functions below are all based on the `console` interface
   */
  debug(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.DEBUG, ...args);
    this._logHandler(this, LogLevel.DEBUG, ...args);
  }
  log(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.VERBOSE, ...args);
    this._logHandler(this, LogLevel.VERBOSE, ...args);
  }
  info(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.INFO, ...args);
    this._logHandler(this, LogLevel.INFO, ...args);
  }
  warn(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.WARN, ...args);
    this._logHandler(this, LogLevel.WARN, ...args);
  }
  error(...args) {
    this._userLogHandler && this._userLogHandler(this, LogLevel.ERROR, ...args);
    this._logHandler(this, LogLevel.ERROR, ...args);
  }
};
var instanceOfAny = (object, constructors) => constructors.some((c2) => object instanceof c2);
var idbProxyableTypes;
var cursorAdvanceMethods;
function getIdbProxyableTypes() {
  return idbProxyableTypes || (idbProxyableTypes = [
    IDBDatabase,
    IDBObjectStore,
    IDBIndex,
    IDBCursor,
    IDBTransaction
  ]);
}
function getCursorAdvanceMethods() {
  return cursorAdvanceMethods || (cursorAdvanceMethods = [
    IDBCursor.prototype.advance,
    IDBCursor.prototype.continue,
    IDBCursor.prototype.continuePrimaryKey
  ]);
}
var cursorRequestMap = /* @__PURE__ */ new WeakMap();
var transactionDoneMap = /* @__PURE__ */ new WeakMap();
var transactionStoreNamesMap = /* @__PURE__ */ new WeakMap();
var transformCache = /* @__PURE__ */ new WeakMap();
var reverseTransformCache = /* @__PURE__ */ new WeakMap();
function promisifyRequest(request) {
  const promise = new Promise((resolve, reject) => {
    const unlisten = () => {
      request.removeEventListener("success", success);
      request.removeEventListener("error", error);
    };
    const success = () => {
      resolve(wrap(request.result));
      unlisten();
    };
    const error = () => {
      reject(request.error);
      unlisten();
    };
    request.addEventListener("success", success);
    request.addEventListener("error", error);
  });
  promise.then((value) => {
    if (value instanceof IDBCursor) {
      cursorRequestMap.set(value, request);
    }
  }).catch(() => {
  });
  reverseTransformCache.set(promise, request);
  return promise;
}
function cacheDonePromiseForTransaction(tx) {
  if (transactionDoneMap.has(tx))
    return;
  const done = new Promise((resolve, reject) => {
    const unlisten = () => {
      tx.removeEventListener("complete", complete);
      tx.removeEventListener("error", error);
      tx.removeEventListener("abort", error);
    };
    const complete = () => {
      resolve();
      unlisten();
    };
    const error = () => {
      reject(tx.error || new DOMException("AbortError", "AbortError"));
      unlisten();
    };
    tx.addEventListener("complete", complete);
    tx.addEventListener("error", error);
    tx.addEventListener("abort", error);
  });
  transactionDoneMap.set(tx, done);
}
var idbProxyTraps = {
  get(target, prop, receiver) {
    if (target instanceof IDBTransaction) {
      if (prop === "done")
        return transactionDoneMap.get(target);
      if (prop === "objectStoreNames") {
        return target.objectStoreNames || transactionStoreNamesMap.get(target);
      }
      if (prop === "store") {
        return receiver.objectStoreNames[1] ? void 0 : receiver.objectStore(receiver.objectStoreNames[0]);
      }
    }
    return wrap(target[prop]);
  },
  set(target, prop, value) {
    target[prop] = value;
    return true;
  },
  has(target, prop) {
    if (target instanceof IDBTransaction && (prop === "done" || prop === "store")) {
      return true;
    }
    return prop in target;
  }
};
function replaceTraps(callback) {
  idbProxyTraps = callback(idbProxyTraps);
}
function wrapFunction(func) {
  if (func === IDBDatabase.prototype.transaction && !("objectStoreNames" in IDBTransaction.prototype)) {
    return function(storeNames, ...args) {
      const tx = func.call(unwrap(this), storeNames, ...args);
      transactionStoreNamesMap.set(tx, storeNames.sort ? storeNames.sort() : [storeNames]);
      return wrap(tx);
    };
  }
  if (getCursorAdvanceMethods().includes(func)) {
    return function(...args) {
      func.apply(unwrap(this), args);
      return wrap(cursorRequestMap.get(this));
    };
  }
  return function(...args) {
    return wrap(func.apply(unwrap(this), args));
  };
}
function transformCachableValue(value) {
  if (typeof value === "function")
    return wrapFunction(value);
  if (value instanceof IDBTransaction)
    cacheDonePromiseForTransaction(value);
  if (instanceOfAny(value, getIdbProxyableTypes()))
    return new Proxy(value, idbProxyTraps);
  return value;
}
function wrap(value) {
  if (value instanceof IDBRequest)
    return promisifyRequest(value);
  if (transformCache.has(value))
    return transformCache.get(value);
  const newValue = transformCachableValue(value);
  if (newValue !== value) {
    transformCache.set(value, newValue);
    reverseTransformCache.set(newValue, value);
  }
  return newValue;
}
var unwrap = (value) => reverseTransformCache.get(value);
function openDB(name2, version2, { blocked, upgrade, blocking, terminated } = {}) {
  const request = indexedDB.open(name2, version2);
  const openPromise = wrap(request);
  if (upgrade) {
    request.addEventListener("upgradeneeded", (event) => {
      upgrade(wrap(request.result), event.oldVersion, event.newVersion, wrap(request.transaction), event);
    });
  }
  if (blocked) {
    request.addEventListener("blocked", (event) => blocked(
      // Casting due to https://github.com/microsoft/TypeScript-DOM-lib-generator/pull/1405
      event.oldVersion,
      event.newVersion,
      event
    ));
  }
  openPromise.then((db) => {
    if (terminated)
      db.addEventListener("close", () => terminated());
    if (blocking) {
      db.addEventListener("versionchange", (event) => blocking(event.oldVersion, event.newVersion, event));
    }
  }).catch(() => {
  });
  return openPromise;
}
var readMethods = ["get", "getKey", "getAll", "getAllKeys", "count"];
var writeMethods = ["put", "add", "delete", "clear"];
var cachedMethods = /* @__PURE__ */ new Map();
function getMethod(target, prop) {
  if (!(target instanceof IDBDatabase && !(prop in target) && typeof prop === "string")) {
    return;
  }
  if (cachedMethods.get(prop))
    return cachedMethods.get(prop);
  const targetFuncName = prop.replace(/FromIndex$/, "");
  const useIndex = prop !== targetFuncName;
  const isWrite = writeMethods.includes(targetFuncName);
  if (
    // Bail if the target doesn't exist on the target. Eg, getAll isn't in Edge.
    !(targetFuncName in (useIndex ? IDBIndex : IDBObjectStore).prototype) || !(isWrite || readMethods.includes(targetFuncName))
  ) {
    return;
  }
  const method = async function(storeName, ...args) {
    const tx = this.transaction(storeName, isWrite ? "readwrite" : "readonly");
    let target2 = tx.store;
    if (useIndex)
      target2 = target2.index(args.shift());
    return (await Promise.all([
      target2[targetFuncName](...args),
      isWrite && tx.done
    ]))[0];
  };
  cachedMethods.set(prop, method);
  return method;
}
replaceTraps((oldTraps) => ({
  ...oldTraps,
  get: (target, prop, receiver) => getMethod(target, prop) || oldTraps.get(target, prop, receiver),
  has: (target, prop) => !!getMethod(target, prop) || oldTraps.has(target, prop)
}));
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var PlatformLoggerServiceImpl = class {
  constructor(container) {
    this.container = container;
  }
  // In initial implementation, this will be called by installations on
  // auth token refresh, and installations will send this string.
  getPlatformInfoString() {
    const providers = this.container.getProviders();
    return providers.map((provider) => {
      if (isVersionServiceProvider(provider)) {
        const service = provider.getImmediate();
        return `${service.library}/${service.version}`;
      } else {
        return null;
      }
    }).filter((logString) => logString).join(" ");
  }
};
function isVersionServiceProvider(provider) {
  const component = provider.getComponent();
  return component?.type === "VERSION";
}
var name$r = "https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js";
var version$1 = "0.16.5";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logger = new Logger("https://www.gstatic.com/firebasejs/13.2.0/firebase-app.js");
var name$q = "@firebase/app-compat";
var name$p = "@firebase/analytics-compat";
var name$o = "@firebase/analytics";
var name$n = "@firebase/app-check-compat";
var name$m = "@firebase/app-check";
var name$l = "@firebase/auth";
var name$k = "@firebase/auth-compat";
var name$j = "@firebase/crashlytics";
var name$i = "@firebase/database";
var name$h = "@firebase/data-connect";
var name$g = "@firebase/database-compat";
var name$f = "@firebase/functions";
var name$e = "@firebase/functions-compat";
var name$d = "@firebase/installations";
var name$c = "@firebase/installations-compat";
var name$b = "@firebase/messaging";
var name$a = "@firebase/messaging-compat";
var name$9 = "@firebase/performance";
var name$8 = "@firebase/performance-compat";
var name$7 = "@firebase/remote-config";
var name$6 = "@firebase/remote-config-compat";
var name$5 = "@firebase/storage";
var name$4 = "@firebase/storage-compat";
var name$3 = "@firebase/firestore";
var name$2 = "@firebase/ai";
var name$1 = "@firebase/firestore-compat";
var name$s = "firebase";
var version$2 = "13.2.0";
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_ENTRY_NAME = "[DEFAULT]";
var PLATFORM_LOG_STRING = {
  [name$r]: "fire-core",
  [name$q]: "fire-core-compat",
  [name$o]: "fire-analytics",
  [name$p]: "fire-analytics-compat",
  [name$m]: "fire-app-check",
  [name$n]: "fire-app-check-compat",
  [name$l]: "fire-auth",
  [name$k]: "fire-auth-compat",
  [name$j]: "fire-cls",
  [name$i]: "fire-rtdb",
  [name$h]: "fire-data-connect",
  [name$g]: "fire-rtdb-compat",
  [name$f]: "fire-fn",
  [name$e]: "fire-fn-compat",
  [name$d]: "fire-iid",
  [name$c]: "fire-iid-compat",
  [name$b]: "fire-fcm",
  [name$a]: "fire-fcm-compat",
  [name$9]: "fire-perf",
  [name$8]: "fire-perf-compat",
  [name$7]: "fire-rc",
  [name$6]: "fire-rc-compat",
  [name$5]: "fire-gcs",
  [name$4]: "fire-gcs-compat",
  [name$3]: "fire-fst",
  [name$1]: "fire-fst-compat",
  [name$2]: "fire-vertex",
  "fire-js": "fire-js",
  // Platform identifier for JS SDK.
  [name$s]: "fire-js-all"
};
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _apps = /* @__PURE__ */ new Map();
var _serverApps = /* @__PURE__ */ new Map();
var _components = /* @__PURE__ */ new Map();
function _addComponent(app, component) {
  try {
    app.container.addComponent(component);
  } catch (e) {
    logger.debug(`Component ${component.name} failed to register with FirebaseApp ${app.name}`, e);
  }
}
function _registerComponent(component) {
  const componentName = component.name;
  if (_components.has(componentName)) {
    logger.debug(`There were multiple attempts to register component ${componentName}.`);
    return false;
  }
  _components.set(componentName, component);
  for (const app of _apps.values()) {
    _addComponent(app, component);
  }
  for (const serverApp of _serverApps.values()) {
    _addComponent(serverApp, component);
  }
  return true;
}
function _getProvider(app, name2) {
  const heartbeatController = app.container.getProvider("heartbeat").getImmediate({ optional: true });
  if (heartbeatController) {
    void heartbeatController.triggerHeartbeat();
  }
  return app.container.getProvider(name2);
}
function _isFirebaseServerApp(obj) {
  if (obj === null || obj === void 0) {
    return false;
  }
  return obj.settings !== void 0;
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ERRORS = {
  [
    "no-app"
    /* AppError.NO_APP */
  ]: "No Firebase App '{$appName}' has been created - call initializeApp() first",
  [
    "bad-app-name"
    /* AppError.BAD_APP_NAME */
  ]: "Illegal App name: '{$appName}'",
  [
    "duplicate-app"
    /* AppError.DUPLICATE_APP */
  ]: "Firebase App named '{$appName}' already exists with different {$mismatchedParam}. Existing: '{$oldValue}'. New: '{$newValue}'.",
  [
    "app-deleted"
    /* AppError.APP_DELETED */
  ]: "Firebase App named '{$appName}' already deleted",
  [
    "server-app-deleted"
    /* AppError.SERVER_APP_DELETED */
  ]: "Firebase Server App has been deleted",
  [
    "no-options"
    /* AppError.NO_OPTIONS */
  ]: "Need to provide options, when not being deployed to hosting via source.",
  [
    "invalid-app-argument"
    /* AppError.INVALID_APP_ARGUMENT */
  ]: "firebase.{$appName}() takes either no argument or a Firebase App instance.",
  [
    "invalid-log-argument"
    /* AppError.INVALID_LOG_ARGUMENT */
  ]: "First argument to `onLog` must be null or a function.",
  [
    "idb-open"
    /* AppError.IDB_OPEN */
  ]: "Error thrown when opening IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "idb-get"
    /* AppError.IDB_GET */
  ]: "Error thrown when reading from IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "idb-set"
    /* AppError.IDB_WRITE */
  ]: "Error thrown when writing to IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "idb-delete"
    /* AppError.IDB_DELETE */
  ]: "Error thrown when deleting from IndexedDB. Original error: {$originalErrorMessage}.",
  [
    "finalization-registry-not-supported"
    /* AppError.FINALIZATION_REGISTRY_NOT_SUPPORTED */
  ]: "FirebaseServerApp deleteOnDeref field defined but the JS runtime does not support FinalizationRegistry.",
  [
    "invalid-server-app-environment"
    /* AppError.INVALID_SERVER_APP_ENVIRONMENT */
  ]: "FirebaseServerApp is not for use in browser environments."
};
var ERROR_FACTORY = new ErrorFactory("app", "Firebase", ERRORS);
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var FirebaseAppImpl = class {
  constructor(options, config, container) {
    this._isDeleted = false;
    this._options = { ...options };
    this._config = { ...config };
    this._name = config.name;
    this._automaticDataCollectionEnabled = config.automaticDataCollectionEnabled;
    this._container = container;
    this.container.addComponent(new Component(
      "app",
      () => this,
      "PUBLIC"
      /* ComponentType.PUBLIC */
    ));
  }
  get automaticDataCollectionEnabled() {
    this.checkDestroyed();
    return this._automaticDataCollectionEnabled;
  }
  set automaticDataCollectionEnabled(val) {
    this.checkDestroyed();
    this._automaticDataCollectionEnabled = val;
  }
  get name() {
    this.checkDestroyed();
    return this._name;
  }
  get options() {
    this.checkDestroyed();
    return this._options;
  }
  get config() {
    this.checkDestroyed();
    return this._config;
  }
  get container() {
    return this._container;
  }
  get isDeleted() {
    return this._isDeleted;
  }
  set isDeleted(val) {
    this._isDeleted = val;
  }
  /**
   * This function will throw an Error if the App has already been deleted -
   * use before performing API actions on the App.
   */
  checkDestroyed() {
    if (this.isDeleted) {
      throw ERROR_FACTORY.create("app-deleted", { appName: this._name });
    }
  }
};
/**
 * @license
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var SDK_VERSION = version$2;
function initializeApp(_options, rawConfig = {}) {
  let options = _options;
  if (typeof rawConfig !== "object") {
    const name3 = rawConfig;
    rawConfig = { name: name3 };
  }
  const config = {
    name: DEFAULT_ENTRY_NAME,
    automaticDataCollectionEnabled: true,
    ...rawConfig
  };
  const name2 = config.name;
  if (typeof name2 !== "string" || !name2) {
    throw ERROR_FACTORY.create("bad-app-name", {
      appName: String(name2)
    });
  }
  options || (options = getDefaultAppConfig());
  if (!options) {
    throw ERROR_FACTORY.create(
      "no-options"
      /* AppError.NO_OPTIONS */
    );
  }
  const existingApp = _apps.get(name2);
  if (existingApp) {
    if (!deepEqual(options, existingApp.options)) {
      throw ERROR_FACTORY.create("duplicate-app", {
        appName: name2,
        mismatchedParam: "options",
        oldValue: JSON.stringify(existingApp.options),
        newValue: JSON.stringify(options)
      });
    } else if (!deepEqual(config, existingApp.config)) {
      throw ERROR_FACTORY.create("duplicate-app", {
        appName: name2,
        mismatchedParam: "config",
        oldValue: JSON.stringify(existingApp.config),
        newValue: JSON.stringify(config)
      });
    } else {
      return existingApp;
    }
  }
  const container = new ComponentContainer(name2);
  for (const component of _components.values()) {
    container.addComponent(component);
  }
  const newApp = new FirebaseAppImpl(options, config, container);
  _apps.set(name2, newApp);
  return newApp;
}
function getApps() {
  return Array.from(_apps.values());
}
function registerVersion(libraryKeyOrName, version2, variant) {
  let library = PLATFORM_LOG_STRING[libraryKeyOrName] ?? libraryKeyOrName;
  if (variant) {
    library += `-${variant}`;
  }
  const libraryMismatch = library.match(/\s|\//);
  const versionMismatch = version2.match(/\s|\//);
  if (libraryMismatch || versionMismatch) {
    const warning = [
      `Unable to register library "${library}" with version "${version2}":`
    ];
    if (libraryMismatch) {
      warning.push(`library name "${library}" contains illegal characters (whitespace or "/")`);
    }
    if (libraryMismatch && versionMismatch) {
      warning.push("and");
    }
    if (versionMismatch) {
      warning.push(`version name "${version2}" contains illegal characters (whitespace or "/")`);
    }
    logger.warn(warning.join(" "));
    return;
  }
  _registerComponent(new Component(
    `${library}-version`,
    () => ({ library, version: version2 }),
    "VERSION"
    /* ComponentType.VERSION */
  ));
}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DB_NAME = "firebase-heartbeat-database";
var DB_VERSION = 1;
var STORE_NAME = "firebase-heartbeat-store";
var dbPromise = null;
function getDbPromise() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade: (db, oldVersion) => {
        switch (oldVersion) {
          case 0:
            try {
              db.createObjectStore(STORE_NAME);
            } catch (e) {
              console.warn(e);
            }
        }
      }
    }).catch((e) => {
      throw ERROR_FACTORY.create("idb-open", {
        originalErrorMessage: e.message
      });
    });
  }
  return dbPromise;
}
async function readHeartbeatsFromIndexedDB(app) {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME);
    const result = await tx.objectStore(STORE_NAME).get(computeKey(app));
    await tx.done;
    return result;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create("idb-get", {
        originalErrorMessage: e?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}
async function writeHeartbeatsToIndexedDB(app, heartbeatObject) {
  try {
    const db = await getDbPromise();
    const tx = db.transaction(STORE_NAME, "readwrite");
    const objectStore = tx.objectStore(STORE_NAME);
    await objectStore.put(heartbeatObject, computeKey(app));
    await tx.done;
  } catch (e) {
    if (e instanceof FirebaseError) {
      logger.warn(e.message);
    } else {
      const idbGetError = ERROR_FACTORY.create("idb-set", {
        originalErrorMessage: e?.message
      });
      logger.warn(idbGetError.message);
    }
  }
}
function computeKey(app) {
  return `${app.name}!${app.options.appId}`;
}
/**
 * @license
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MAX_HEADER_BYTES = 1024;
var MAX_NUM_STORED_HEARTBEATS = 30;
var HeartbeatServiceImpl = class {
  constructor(container) {
    this.container = container;
    this._heartbeatsCache = null;
    const app = this.container.getProvider("app").getImmediate();
    this._storage = new HeartbeatStorageImpl(app);
    this._heartbeatsCachePromise = this._storage.read().then((result) => {
      this._heartbeatsCache = result;
      return result;
    });
  }
  /**
   * Called to report a heartbeat. The function will generate
   * a HeartbeatsByUserAgent object, update heartbeatsCache, and persist it
   * to IndexedDB.
   * Note that we only store one heartbeat per day. So if a heartbeat for today is
   * already logged, subsequent calls to this function in the same day will be ignored.
   */
  async triggerHeartbeat() {
    try {
      const platformLogger = this.container.getProvider("platform-logger").getImmediate();
      const agent = platformLogger.getPlatformInfoString();
      const date = getUTCDateString();
      if (this._heartbeatsCache?.heartbeats == null) {
        this._heartbeatsCache = await this._heartbeatsCachePromise;
        if (this._heartbeatsCache?.heartbeats == null) {
          return;
        }
      }
      if (this._heartbeatsCache.lastSentHeartbeatDate === date || this._heartbeatsCache.heartbeats.some((singleDateHeartbeat) => singleDateHeartbeat.date === date)) {
        return;
      } else {
        this._heartbeatsCache.heartbeats.push({ date, agent });
        if (this._heartbeatsCache.heartbeats.length > MAX_NUM_STORED_HEARTBEATS) {
          const earliestHeartbeatIdx = getEarliestHeartbeatIdx(this._heartbeatsCache.heartbeats);
          this._heartbeatsCache.heartbeats.splice(earliestHeartbeatIdx, 1);
        }
      }
      return this._storage.overwrite(this._heartbeatsCache);
    } catch (e) {
      logger.warn(e);
    }
  }
  /**
   * Returns a base64 encoded string which can be attached to the heartbeat-specific header directly.
   * It also clears all heartbeats from memory as well as in IndexedDB.
   *
   * NOTE: Consuming product SDKs should not send the header if this method
   * returns an empty string.
   */
  async getHeartbeatsHeader() {
    try {
      if (this._heartbeatsCache === null) {
        await this._heartbeatsCachePromise;
      }
      if (this._heartbeatsCache?.heartbeats == null || this._heartbeatsCache.heartbeats.length === 0) {
        return "";
      }
      const date = getUTCDateString();
      const { heartbeatsToSend, unsentEntries } = extractHeartbeatsForHeader(this._heartbeatsCache.heartbeats);
      const headerString = base64urlEncodeWithoutPadding(JSON.stringify({ version: 2, heartbeats: heartbeatsToSend }));
      this._heartbeatsCache.lastSentHeartbeatDate = date;
      if (unsentEntries.length > 0) {
        this._heartbeatsCache.heartbeats = unsentEntries;
        await this._storage.overwrite(this._heartbeatsCache);
      } else {
        this._heartbeatsCache.heartbeats = [];
        void this._storage.overwrite(this._heartbeatsCache);
      }
      return headerString;
    } catch (e) {
      logger.warn(e);
      return "";
    }
  }
};
function getUTCDateString() {
  const today = /* @__PURE__ */ new Date();
  return today.toISOString().substring(0, 10);
}
function extractHeartbeatsForHeader(heartbeatsCache, maxSize = MAX_HEADER_BYTES) {
  const heartbeatsToSend = [];
  let unsentEntries = heartbeatsCache.slice();
  for (const singleDateHeartbeat of heartbeatsCache) {
    const heartbeatEntry = heartbeatsToSend.find((hb) => hb.agent === singleDateHeartbeat.agent);
    if (!heartbeatEntry) {
      heartbeatsToSend.push({
        agent: singleDateHeartbeat.agent,
        dates: [singleDateHeartbeat.date]
      });
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatsToSend.pop();
        break;
      }
    } else {
      heartbeatEntry.dates.push(singleDateHeartbeat.date);
      if (countBytes(heartbeatsToSend) > maxSize) {
        heartbeatEntry.dates.pop();
        break;
      }
    }
    unsentEntries = unsentEntries.slice(1);
  }
  return {
    heartbeatsToSend,
    unsentEntries
  };
}
var HeartbeatStorageImpl = class {
  constructor(app) {
    this.app = app;
    this._canUseIndexedDBPromise = this.runIndexedDBEnvironmentCheck();
  }
  async runIndexedDBEnvironmentCheck() {
    if (!isIndexedDBAvailable()) {
      return false;
    } else {
      return validateIndexedDBOpenable().then(() => true).catch(() => false);
    }
  }
  /**
   * Read all heartbeats.
   */
  async read() {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return { heartbeats: [] };
    } else {
      const idbHeartbeatObject = await readHeartbeatsFromIndexedDB(this.app);
      if (idbHeartbeatObject?.heartbeats) {
        return idbHeartbeatObject;
      } else {
        return { heartbeats: [] };
      }
    }
  }
  // overwrite the storage with the provided heartbeats
  async overwrite(heartbeatsObject) {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      const existingHeartbeatsObject = await this.read();
      return writeHeartbeatsToIndexedDB(this.app, {
        lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
        heartbeats: heartbeatsObject.heartbeats
      });
    }
  }
  // add heartbeats
  async add(heartbeatsObject) {
    const canUseIndexedDB = await this._canUseIndexedDBPromise;
    if (!canUseIndexedDB) {
      return;
    } else {
      const existingHeartbeatsObject = await this.read();
      return writeHeartbeatsToIndexedDB(this.app, {
        lastSentHeartbeatDate: heartbeatsObject.lastSentHeartbeatDate ?? existingHeartbeatsObject.lastSentHeartbeatDate,
        heartbeats: [
          ...existingHeartbeatsObject.heartbeats,
          ...heartbeatsObject.heartbeats
        ]
      });
    }
  }
};
function countBytes(heartbeatsCache) {
  return base64urlEncodeWithoutPadding(
    // heartbeatsCache wrapper properties
    JSON.stringify({ version: 2, heartbeats: heartbeatsCache })
  ).length;
}
function getEarliestHeartbeatIdx(heartbeats) {
  if (heartbeats.length === 0) {
    return -1;
  }
  let earliestHeartbeatIdx = 0;
  let earliestHeartbeatDate = heartbeats[0].date;
  for (let i = 1; i < heartbeats.length; i++) {
    if (heartbeats[i].date < earliestHeartbeatDate) {
      earliestHeartbeatDate = heartbeats[i].date;
      earliestHeartbeatIdx = i;
    }
  }
  return earliestHeartbeatIdx;
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function registerCoreComponents(variant) {
  _registerComponent(new Component(
    "platform-logger",
    (container) => new PlatformLoggerServiceImpl(container),
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
  _registerComponent(new Component(
    "heartbeat",
    (container) => new HeartbeatServiceImpl(container),
    "PRIVATE"
    /* ComponentType.PRIVATE */
  ));
  registerVersion(name$r, version$1, variant);
  registerVersion(name$r, version$1, "esm2020");
  registerVersion("fire-js", "");
}
/**
 * @license
 * Copyright 2019 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
registerCoreComponents("");
var name = "firebase";
var version = "13.2.0";
/**
 * @license
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
registerVersion(name, version, "cdn");

// cloudflare-saas/vendor/firebase-13.2.0/firebase-auth.js
var s = { byteToCharMap_: null, charToByteMap_: null, byteToCharMapWebSafe_: null, charToByteMapWebSafe_: null, ENCODED_VALS_BASE: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", get ENCODED_VALS() {
  return this.ENCODED_VALS_BASE + "+/=";
}, get ENCODED_VALS_WEBSAFE() {
  return this.ENCODED_VALS_BASE + "-_.";
}, HAS_NATIVE_SUPPORT: "function" == typeof atob, encodeByteArray(e, t) {
  if (!Array.isArray(e)) throw Error("encodeByteArray takes an array as a parameter");
  this.init_();
  const r = t ? this.byteToCharMapWebSafe_ : this.byteToCharMap_, n = [];
  for (let t2 = 0; t2 < e.length; t2 += 3) {
    const i = e[t2], s2 = t2 + 1 < e.length, o2 = s2 ? e[t2 + 1] : 0, a2 = t2 + 2 < e.length, c2 = a2 ? e[t2 + 2] : 0, u2 = i >> 2, d2 = (3 & i) << 4 | o2 >> 4;
    let l2 = (15 & o2) << 2 | c2 >> 6, h = 63 & c2;
    a2 || (h = 64, s2 || (l2 = 64)), n.push(r[u2], r[d2], r[l2], r[h]);
  }
  return n.join("");
}, encodeString(e, t) {
  return this.HAS_NATIVE_SUPPORT && !t ? btoa(e) : this.encodeByteArray((function(e2) {
    const t2 = [];
    let r = 0;
    for (let n = 0; n < e2.length; n++) {
      let i = e2.charCodeAt(n);
      i < 128 ? t2[r++] = i : i < 2048 ? (t2[r++] = i >> 6 | 192, t2[r++] = 63 & i | 128) : 55296 == (64512 & i) && n + 1 < e2.length && 56320 == (64512 & e2.charCodeAt(n + 1)) ? (i = 65536 + ((1023 & i) << 10) + (1023 & e2.charCodeAt(++n)), t2[r++] = i >> 18 | 240, t2[r++] = i >> 12 & 63 | 128, t2[r++] = i >> 6 & 63 | 128, t2[r++] = 63 & i | 128) : (t2[r++] = i >> 12 | 224, t2[r++] = i >> 6 & 63 | 128, t2[r++] = 63 & i | 128);
    }
    return t2;
  })(e), t);
}, decodeString(e, t) {
  return this.HAS_NATIVE_SUPPORT && !t ? atob(e) : (function(e2) {
    const t2 = [];
    let r = 0, n = 0;
    for (; r < e2.length; ) {
      const i = e2[r++];
      if (i < 128) t2[n++] = String.fromCharCode(i);
      else if (i > 191 && i < 224) {
        const s2 = e2[r++];
        t2[n++] = String.fromCharCode((31 & i) << 6 | 63 & s2);
      } else if (i > 239 && i < 365) {
        const s2 = ((7 & i) << 18 | (63 & e2[r++]) << 12 | (63 & e2[r++]) << 6 | 63 & e2[r++]) - 65536;
        t2[n++] = String.fromCharCode(55296 + (s2 >> 10)), t2[n++] = String.fromCharCode(56320 + (1023 & s2));
      } else {
        const s2 = e2[r++], o2 = e2[r++];
        t2[n++] = String.fromCharCode((15 & i) << 12 | (63 & s2) << 6 | 63 & o2);
      }
    }
    return t2.join("");
  })(this.decodeStringToByteArray(e, t));
}, decodeStringToByteArray(e, t) {
  this.init_();
  const r = t ? this.charToByteMapWebSafe_ : this.charToByteMap_, n = [];
  for (let t2 = 0; t2 < e.length; ) {
    const i = r[e.charAt(t2++)], s2 = t2 < e.length ? r[e.charAt(t2)] : 0;
    ++t2;
    const o2 = t2 < e.length ? r[e.charAt(t2)] : 64;
    ++t2;
    const a2 = t2 < e.length ? r[e.charAt(t2)] : 64;
    if (++t2, null == i || null == s2 || null == o2 || null == a2) throw new DecodeBase64StringError2();
    const c2 = i << 2 | s2 >> 4;
    if (n.push(c2), 64 !== o2) {
      const e2 = s2 << 4 & 240 | o2 >> 2;
      if (n.push(e2), 64 !== a2) {
        const e3 = o2 << 6 & 192 | a2;
        n.push(e3);
      }
    }
  }
  return n;
}, init_() {
  if (!this.byteToCharMap_) {
    this.byteToCharMap_ = {}, this.charToByteMap_ = {}, this.byteToCharMapWebSafe_ = {}, this.charToByteMapWebSafe_ = {};
    for (let e = 0; e < this.ENCODED_VALS.length; e++) this.byteToCharMap_[e] = this.ENCODED_VALS.charAt(e), this.charToByteMap_[this.byteToCharMap_[e]] = e, this.byteToCharMapWebSafe_[e] = this.ENCODED_VALS_WEBSAFE.charAt(e), this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[e]] = e, e >= this.ENCODED_VALS_BASE.length && (this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(e)] = e, this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(e)] = e);
  }
} };
var DecodeBase64StringError2 = class extends Error {
  constructor() {
    super(...arguments), this.name = "DecodeBase64StringError";
  }
};
var base64Decode2 = function(e) {
  try {
    return s.decodeString(e, true);
  } catch (e2) {
    console.error("base64Decode failed: ", e2);
  }
  return null;
};
var getDefaultsFromGlobal2 = () => (function getGlobal2() {
  if ("undefined" != typeof self) return self;
  if ("undefined" != typeof window) return window;
  if ("undefined" != typeof global) return global;
  throw new Error("Unable to locate global object.");
})().__FIREBASE_DEFAULTS__;
var getDefaults2 = () => {
  try {
    return getDefaultsFromGlobal2() || (() => {
      if ("undefined" == typeof process || void 0 === process.env) return;
      const e = process.env.__FIREBASE_DEFAULTS__;
      return e ? JSON.parse(e) : void 0;
    })() || (() => {
      if ("undefined" == typeof document) return;
      let e;
      try {
        e = document.cookie.match(/__FIREBASE_DEFAULTS__=([^;]+)/);
      } catch (e2) {
        return;
      }
      const t = e && base64Decode2(e[1]);
      return t && JSON.parse(t);
    })();
  } catch (e) {
    return void console.info(`Unable to get __FIREBASE_DEFAULTS__ due to: ${e}`);
  }
};
var getExperimentalSetting = (e) => getDefaults2()?.[`_${e}`];
var Deferred2 = class {
  constructor() {
    this.reject = () => {
    }, this.resolve = () => {
    }, this.promise = new Promise(((e, t) => {
      this.resolve = e, this.reject = t;
    }));
  }
  wrapCallback(e) {
    return (t, r) => {
      t ? this.reject(t) : this.resolve(r), "function" == typeof e && (this.promise.catch((() => {
      })), 1 === e.length ? e(t) : e(t, r));
    };
  }
};
function getUA() {
  return "undefined" != typeof navigator && "string" == typeof navigator.userAgent ? navigator.userAgent : "";
}
var FirebaseError2 = class _FirebaseError extends Error {
  constructor(e, t, r) {
    super(t), this.code = e, this.customData = r, this.name = "FirebaseError", Object.setPrototypeOf(this, _FirebaseError.prototype), Error.captureStackTrace && Error.captureStackTrace(this, ErrorFactory2.prototype.create);
  }
};
var ErrorFactory2 = class {
  constructor(e, t, r) {
    this.service = e, this.serviceName = t, this.errors = r;
  }
  create(e, ...t) {
    const r = t[0] || {}, n = `${this.service}/${e}`, i = this.errors[e], s2 = i ? (function replaceTemplate2(e2, t2) {
      try {
        let r2 = 0, n2 = "";
        for (; r2 < e2.length; ) {
          const i2 = e2.indexOf("{$", r2);
          if (-1 === i2) {
            n2 += e2.substring(r2);
            break;
          }
          const s3 = e2.indexOf("}", i2 + 2);
          if (-1 === s3) {
            n2 += e2.substring(r2);
            break;
          }
          const o3 = e2.substring(i2 + 2, s3), a2 = t2[o3];
          n2 += e2.substring(r2, i2) + (null != a2 ? String(a2) : `<${o3}?>`), r2 = s3 + 1;
        }
        return n2;
      } catch (t3) {
        return e2;
      }
    })(i, r) : "Error", o2 = `${this.serviceName}: ${s2} (${n}).`;
    return new FirebaseError2(n, o2, r);
  }
};
function deepEqual2(e, t) {
  if (e === t) return true;
  const r = Object.keys(e), n = Object.keys(t);
  for (const i of r) {
    if (!n.includes(i)) return false;
    const r2 = e[i], s2 = t[i];
    if (isObject2(r2) && isObject2(s2)) {
      if (!deepEqual2(r2, s2)) return false;
    } else if (r2 !== s2) return false;
  }
  for (const e2 of n) if (!r.includes(e2)) return false;
  return true;
}
function isObject2(e) {
  return null !== e && "object" == typeof e;
}
function querystring(e) {
  const t = [];
  for (const [r, n] of Object.entries(e)) Array.isArray(n) ? n.forEach(((e2) => {
    t.push(encodeURIComponent(r) + "=" + encodeURIComponent(e2));
  })) : t.push(encodeURIComponent(r) + "=" + encodeURIComponent(n));
  return t.length ? "&" + t.join("&") : "";
}
function querystringDecode(e) {
  const t = {};
  return e.replace(/^\?/, "").split("&").forEach(((e2) => {
    if (e2) {
      const [r, n] = e2.split("=");
      t[decodeURIComponent(r)] = decodeURIComponent(n);
    }
  })), t;
}
function extractQuerystring(e) {
  const t = e.indexOf("?");
  if (!t) return "";
  const r = e.indexOf("#", t);
  return e.substring(t, r > 0 ? r : void 0);
}
var ObserverProxy = class {
  constructor(e, t) {
    this.observers = [], this.unsubscribes = [], this.observerCount = 0, this.task = Promise.resolve(), this.finalized = false, this.onNoObservers = t, this.task.then((() => {
      e(this);
    })).catch(((e2) => {
      this.error(e2);
    }));
  }
  next(e) {
    this.forEachObserver(((t) => {
      t.next(e);
    }));
  }
  error(e) {
    this.forEachObserver(((t) => {
      t.error(e);
    })), this.close(e);
  }
  complete() {
    this.forEachObserver(((e) => {
      e.complete();
    })), this.close();
  }
  subscribe(e, t, r) {
    let n;
    if (void 0 === e && void 0 === t && void 0 === r) throw new Error("Missing Observer.");
    n = (function implementsAnyMethods(e2, t2) {
      if ("object" != typeof e2 || null === e2) return false;
      for (const r2 of t2) if (r2 in e2 && "function" == typeof e2[r2]) return true;
      return false;
    })(e, ["next", "error", "complete"]) ? e : { next: e, error: t, complete: r }, void 0 === n.next && (n.next = noop), void 0 === n.error && (n.error = noop), void 0 === n.complete && (n.complete = noop);
    const i = this.unsubscribeOne.bind(this, this.observers.length);
    return this.finalized && this.task.then((() => {
      try {
        this.finalError ? n.error(this.finalError) : n.complete();
      } catch (e2) {
      }
    })), this.observers.push(n), i;
  }
  unsubscribeOne(e) {
    void 0 !== this.observers && void 0 !== this.observers[e] && (delete this.observers[e], this.observerCount -= 1, 0 === this.observerCount && void 0 !== this.onNoObservers && this.onNoObservers(this));
  }
  forEachObserver(e) {
    if (!this.finalized) for (let t = 0; t < this.observers.length; t++) this.sendOne(t, e);
  }
  sendOne(e, t) {
    this.task.then((() => {
      if (void 0 !== this.observers && void 0 !== this.observers[e]) try {
        t(this.observers[e]);
      } catch (e2) {
        "undefined" != typeof console && console.error && console.error(e2);
      }
    }));
  }
  close(e) {
    this.finalized || (this.finalized = true, void 0 !== e && (this.finalError = e), this.task.then((() => {
      this.observers = void 0, this.onNoObservers = void 0;
    })));
  }
};
function noop() {
}
function getModularInstance(e) {
  return e && e._delegate ? e._delegate : e;
}
function isCloudWorkstation(e) {
  try {
    return (e.startsWith("http://") || e.startsWith("https://") ? new URL(e).hostname : e).endsWith(".cloudworkstations.dev");
  } catch {
    return false;
  }
}
var o;
!(function(e) {
  e[e.DEBUG = 0] = "DEBUG", e[e.VERBOSE = 1] = "VERBOSE", e[e.INFO = 2] = "INFO", e[e.WARN = 3] = "WARN", e[e.ERROR = 4] = "ERROR", e[e.SILENT = 5] = "SILENT";
})(o || (o = {}));
var a = { debug: o.DEBUG, verbose: o.VERBOSE, info: o.INFO, warn: o.WARN, error: o.ERROR, silent: o.SILENT };
var c = o.INFO;
var u = { [o.DEBUG]: "log", [o.VERBOSE]: "log", [o.INFO]: "info", [o.WARN]: "warn", [o.ERROR]: "error" };
var defaultLogHandler2 = (e, t, ...r) => {
  if (t < e.logLevel) return;
  const n = (/* @__PURE__ */ new Date()).toISOString(), i = u[t];
  if (!i) throw new Error(`Attempted to log a message with an invalid logType (value: ${t})`);
  console[i](`[${n}]  ${e.name}:`, ...r);
};
var Component2 = class {
  constructor(e, t, r) {
    this.name = e, this.instanceFactory = t, this.type = r, this.multipleInstances = false, this.serviceProps = {}, this.instantiationMode = "LAZY", this.onInstanceCreated = null;
  }
  setInstantiationMode(e) {
    return this.instantiationMode = e, this;
  }
  setMultipleInstances(e) {
    return this.multipleInstances = e, this;
  }
  setServiceProps(e) {
    return this.serviceProps = e, this;
  }
  setInstanceCreatedCallback(e) {
    return this.onInstanceCreated = e, this;
  }
};
var d;
var l;
!(function(e) {
  e.LAZY = "LAZY", e.EAGER = "EAGER", e.EXPLICIT = "EXPLICIT";
})(d || (d = {})), (function(e) {
  e.PUBLIC = "PUBLIC", e.PRIVATE = "PRIVATE", e.VERSION = "VERSION";
})(l || (l = {}));
function _prodErrorMap() {
  return { "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK." };
}
var I = _prodErrorMap;
var v = new ErrorFactory2("auth", "Firebase", { "dependent-sdk-initialized-before-auth": "Another Firebase SDK was initialized and is trying to use Auth before Auth is initialized. Please be sure to call `initializeAuth` or `getAuth` before starting any other Firebase SDK." });
var A = new class Logger2 {
  constructor(e) {
    this.name = e, this._logLevel = c, this._logHandler = defaultLogHandler2, this._userLogHandler = null;
  }
  get logLevel() {
    return this._logLevel;
  }
  set logLevel(e) {
    if (!(e in o)) throw new TypeError(`Invalid value "${e}" assigned to \`logLevel\``);
    this._logLevel = e;
  }
  setLogLevel(e) {
    this._logLevel = "string" == typeof e ? a[e] : e;
  }
  get logHandler() {
    return this._logHandler;
  }
  set logHandler(e) {
    if ("function" != typeof e) throw new TypeError("Value assigned to `logHandler` must be a function");
    this._logHandler = e;
  }
  get userLogHandler() {
    return this._userLogHandler;
  }
  set userLogHandler(e) {
    this._userLogHandler = e;
  }
  debug(...e) {
    this._userLogHandler && this._userLogHandler(this, o.DEBUG, ...e), this._logHandler(this, o.DEBUG, ...e);
  }
  log(...e) {
    this._userLogHandler && this._userLogHandler(this, o.VERBOSE, ...e), this._logHandler(this, o.VERBOSE, ...e);
  }
  info(...e) {
    this._userLogHandler && this._userLogHandler(this, o.INFO, ...e), this._logHandler(this, o.INFO, ...e);
  }
  warn(...e) {
    this._userLogHandler && this._userLogHandler(this, o.WARN, ...e), this._logHandler(this, o.WARN, ...e);
  }
  error(...e) {
    this._userLogHandler && this._userLogHandler(this, o.ERROR, ...e), this._logHandler(this, o.ERROR, ...e);
  }
}("@firebase/auth");
function _logWarn(e, ...t) {
  A.logLevel <= o.WARN && A.warn(`Auth (${SDK_VERSION}): ${e}`, ...t);
}
function _logError(e, ...t) {
  A.logLevel <= o.ERROR && A.error(`Auth (${SDK_VERSION}): ${e}`, ...t);
}
function _fail(e, ...t) {
  throw createErrorInternal(e, ...t);
}
function _createError(e, ...t) {
  return createErrorInternal(e, ...t);
}
function _errorWithCustomMessage(e, t, r) {
  const n = { ...I(), [t]: r };
  return new ErrorFactory2("auth", "Firebase", n).create(t, { appName: e.name });
}
function _serverAppCurrentUserOperationNotSupportedError(e) {
  return _errorWithCustomMessage(e, "operation-not-supported-in-this-environment", "Operations that alter the current user are not supported in conjunction with FirebaseServerApp");
}
function _assertInstanceOf(e, t, r) {
  if (!(t instanceof r)) throw r.name !== t.constructor.name && _fail(e, "argument-error"), _errorWithCustomMessage(e, "argument-error", `Type of ${t.constructor.name} does not match expected instance.Did you pass a reference from a different Auth SDK?`);
}
function createErrorInternal(e, ...t) {
  if ("string" != typeof e) {
    const r = t[0], n = [...t.slice(1)];
    return n[0] && (n[0].appName = e.name), e._errorFactory.create(r, ...n);
  }
  return v.create(e, ...t);
}
function _assert(e, t, ...r) {
  if (!e) throw createErrorInternal(t, ...r);
}
function debugFail(e) {
  const t = "INTERNAL ASSERTION FAILED: " + e;
  throw _logError(t), new Error(t);
}
function debugAssert(e, t) {
  e || debugFail(t);
}
function _getCurrentUrl() {
  return "undefined" != typeof self && self.location?.href || "";
}
function _isHttpOrHttps() {
  return "http:" === _getCurrentScheme() || "https:" === _getCurrentScheme();
}
function _getCurrentScheme() {
  return "undefined" != typeof self && self.location?.protocol || null;
}
function _isOnline() {
  return !("undefined" != typeof navigator && navigator && "onLine" in navigator && "boolean" == typeof navigator.onLine && (_isHttpOrHttps() || (function isBrowserExtension() {
    const e = "object" == typeof chrome ? chrome.runtime : "object" == typeof browser ? browser.runtime : void 0;
    return "object" == typeof e && void 0 !== e.id;
  })() || "connection" in navigator)) || navigator.onLine;
}
var Delay = class {
  constructor(e, t) {
    this.shortDelay = e, this.longDelay = t, debugAssert(t > e, "Short delay should be less than long delay!"), this.isMobile = (function isMobileCordova() {
      return "undefined" != typeof window && !!(window.cordova || window.phonegap || window.PhoneGap) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA());
    })() || (function isReactNative() {
      return "object" == typeof navigator && "ReactNative" === navigator.product;
    })();
  }
  get() {
    return _isOnline() ? this.isMobile ? this.longDelay : this.shortDelay : Math.min(5e3, this.shortDelay);
  }
};
function _emulatorUrl(e, t) {
  debugAssert(e.emulator, "Emulator should always be set here");
  const { url: r } = e.emulator;
  return t ? `${r}${t.startsWith("/") ? t.slice(1) : t}` : r;
}
var FetchProvider = class {
  static initialize(e, t, r) {
    this.fetchImpl = e, t && (this.headersImpl = t), r && (this.responseImpl = r);
  }
  static fetch() {
    return this.fetchImpl ? this.fetchImpl : "undefined" != typeof self && "fetch" in self ? self.fetch : "undefined" != typeof globalThis && globalThis.fetch ? globalThis.fetch : "undefined" != typeof fetch ? fetch : void debugFail("Could not find fetch implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
  }
  static headers() {
    return this.headersImpl ? this.headersImpl : "undefined" != typeof self && "Headers" in self ? self.Headers : "undefined" != typeof globalThis && globalThis.Headers ? globalThis.Headers : "undefined" != typeof Headers ? Headers : void debugFail("Could not find Headers implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
  }
  static response() {
    return this.responseImpl ? this.responseImpl : "undefined" != typeof self && "Response" in self ? self.Response : "undefined" != typeof globalThis && globalThis.Response ? globalThis.Response : "undefined" != typeof Response ? Response : void debugFail("Could not find Response implementation, make sure you call FetchProvider.initialize() with an appropriate polyfill");
  }
};
var T = { CREDENTIAL_MISMATCH: "custom-token-mismatch", MISSING_CUSTOM_TOKEN: "internal-error", INVALID_IDENTIFIER: "invalid-email", MISSING_CONTINUE_URI: "internal-error", INVALID_PASSWORD: "wrong-password", MISSING_PASSWORD: "missing-password", INVALID_LOGIN_CREDENTIALS: "invalid-credential", EMAIL_EXISTS: "email-already-in-use", PASSWORD_LOGIN_DISABLED: "operation-not-allowed", INVALID_IDP_RESPONSE: "invalid-credential", INVALID_PENDING_TOKEN: "invalid-credential", FEDERATED_USER_ID_ALREADY_LINKED: "credential-already-in-use", MISSING_REQ_TYPE: "internal-error", EMAIL_NOT_FOUND: "user-not-found", RESET_PASSWORD_EXCEED_LIMIT: "too-many-requests", EXPIRED_OOB_CODE: "expired-action-code", INVALID_OOB_CODE: "invalid-action-code", MISSING_OOB_CODE: "internal-error", CREDENTIAL_TOO_OLD_LOGIN_AGAIN: "requires-recent-login", INVALID_ID_TOKEN: "invalid-user-token", TOKEN_EXPIRED: "user-token-expired", USER_NOT_FOUND: "user-token-expired", TOO_MANY_ATTEMPTS_TRY_LATER: "too-many-requests", PASSWORD_DOES_NOT_MEET_REQUIREMENTS: "password-does-not-meet-requirements", INVALID_CODE: "invalid-verification-code", INVALID_SESSION_INFO: "invalid-verification-id", INVALID_TEMPORARY_PROOF: "invalid-credential", MISSING_SESSION_INFO: "missing-verification-id", SESSION_EXPIRED: "code-expired", MISSING_ANDROID_PACKAGE_NAME: "missing-android-pkg-name", UNAUTHORIZED_DOMAIN: "unauthorized-continue-uri", INVALID_OAUTH_CLIENT_ID: "invalid-oauth-client-id", ADMIN_ONLY_OPERATION: "admin-restricted-operation", INVALID_MFA_PENDING_CREDENTIAL: "invalid-multi-factor-session", MFA_ENROLLMENT_NOT_FOUND: "multi-factor-info-not-found", MISSING_MFA_ENROLLMENT_ID: "missing-multi-factor-info", MISSING_MFA_PENDING_CREDENTIAL: "missing-multi-factor-session", SECOND_FACTOR_EXISTS: "second-factor-already-in-use", SECOND_FACTOR_LIMIT_EXCEEDED: "maximum-second-factor-count-exceeded", BLOCKING_FUNCTION_ERROR_RESPONSE: "internal-error", RECAPTCHA_NOT_ENABLED: "recaptcha-not-enabled", MISSING_RECAPTCHA_TOKEN: "missing-recaptcha-token", INVALID_RECAPTCHA_TOKEN: "invalid-recaptcha-token", INVALID_RECAPTCHA_ACTION: "invalid-recaptcha-action", MISSING_CLIENT_TYPE: "missing-client-type", MISSING_RECAPTCHA_VERSION: "missing-recaptcha-version", INVALID_RECAPTCHA_VERSION: "invalid-recaptcha-version", INVALID_REQ_TYPE: "invalid-req-type" };
var y = ["/v1/accounts:signInWithCustomToken", "/v1/accounts:signInWithEmailLink", "/v1/accounts:signInWithIdp", "/v1/accounts:signInWithPassword", "/v1/accounts:signInWithPhoneNumber", "/v1/token"];
var w = new Delay(3e4, 6e4);
function _addTidIfNecessary(e, t) {
  return e.tenantId && !t.tenantId ? { ...t, tenantId: e.tenantId } : t;
}
async function _performApiRequest(e, t, r, n, i = {}) {
  return _performFetchWithErrorHandling(e, i, (async () => {
    let i2 = {}, s2 = {};
    n && ("GET" === t ? s2 = n : i2 = { body: JSON.stringify(n) });
    const o2 = querystring({ ...s2, key: e.config.apiKey }).slice(1), a2 = await e._getAdditionalHeaders();
    a2["Content-Type"] = "application/json", e.languageCode && (a2["X-Firebase-Locale"] = e.languageCode);
    const c2 = { method: t, headers: a2, ...i2 };
    return (function isCloudflareWorker() {
      return "undefined" != typeof navigator && "Cloudflare-Workers" === navigator.userAgent;
    })() || (c2.referrerPolicy = "strict-origin-when-cross-origin"), e.emulatorConfig && isCloudWorkstation(e.emulatorConfig.host) && (c2.credentials = "include"), FetchProvider.fetch()(await _getFinalTarget(e, e.config.apiHost, r, o2), c2);
  }));
}
async function _performFetchWithErrorHandling(e, t, r) {
  e._canInitEmulator = false;
  const n = { ...T, ...t };
  try {
    const t2 = new NetworkTimeout(e), i = await Promise.race([r(), t2.promise]);
    t2.clearNetworkTimeout();
    const s2 = await i.json();
    if ("needConfirmation" in s2) throw _makeTaggedError(e, "account-exists-with-different-credential", s2);
    if (i.ok && !("errorMessage" in s2)) return s2;
    {
      const t3 = i.ok ? s2.errorMessage : s2.error.message, [r2, o2] = t3.split(" : ");
      if ("FEDERATED_USER_ID_ALREADY_LINKED" === r2) throw _makeTaggedError(e, "credential-already-in-use", s2);
      if ("EMAIL_EXISTS" === r2) throw _makeTaggedError(e, "email-already-in-use", s2);
      if ("USER_DISABLED" === r2) throw _makeTaggedError(e, "user-disabled", s2);
      const a2 = n[r2] || r2.toLowerCase().replace(/[_\s]+/g, "-");
      if (o2) throw _errorWithCustomMessage(e, a2, o2);
      _fail(e, a2);
    }
  } catch (t2) {
    if (t2 instanceof FirebaseError2) throw t2;
    _fail(e, "network-request-failed", { message: String(t2) });
  }
}
async function _performSignInRequest(e, t, r, n, i = {}) {
  const s2 = await _performApiRequest(e, t, r, n, i);
  return "mfaPendingCredential" in s2 && _fail(e, "multi-factor-auth-required", { _serverResponse: s2 }), s2;
}
async function _getFinalTarget(e, t, r, n) {
  const i = `${t}${r}?${n}`, s2 = e, o2 = s2.config.emulator ? _emulatorUrl(e.config, i) : `${e.config.apiScheme}://${i}`;
  if (y.includes(r) && (await s2._persistenceManagerAvailable, "COOKIE" === s2._getPersistenceType())) {
    return s2._getPersistence()._getFinalTarget(o2).toString();
  }
  return o2;
}
function _parseEnforcementState(e) {
  switch (e) {
    case "ENFORCE":
      return "ENFORCE";
    case "AUDIT":
      return "AUDIT";
    case "OFF":
      return "OFF";
    default:
      return "ENFORCEMENT_STATE_UNSPECIFIED";
  }
}
var NetworkTimeout = class {
  clearNetworkTimeout() {
    clearTimeout(this.timer);
  }
  constructor(e) {
    this.auth = e, this.timer = null, this.promise = new Promise(((e2, t) => {
      this.timer = setTimeout((() => t(_createError(this.auth, "network-request-failed"))), w.get());
    }));
  }
};
function _makeTaggedError(e, t, r) {
  const n = { appName: e.name };
  r.email && (n.email = r.email), r.phoneNumber && (n.phoneNumber = r.phoneNumber);
  const i = _createError(e, t, n);
  return i.customData._tokenResponse = r, i;
}
function isEnterprise(e) {
  return void 0 !== e && void 0 !== e.enterprise;
}
var RecaptchaConfig = class {
  constructor(e) {
    if (this.siteKey = "", this.recaptchaEnforcementState = [], void 0 === e.recaptchaKey) throw new Error("recaptchaKey undefined");
    this.siteKey = e.recaptchaKey.split("/")[3], this.recaptchaEnforcementState = e.recaptchaEnforcementState;
  }
  getProviderEnforcementState(e) {
    if (!this.recaptchaEnforcementState || 0 === this.recaptchaEnforcementState.length) return null;
    for (const t of this.recaptchaEnforcementState) if (t.provider && t.provider === e) return _parseEnforcementState(t.enforcementState);
    return null;
  }
  isProviderEnabled(e) {
    return "ENFORCE" === this.getProviderEnforcementState(e) || "AUDIT" === this.getProviderEnforcementState(e);
  }
  isAnyProviderEnabled() {
    return this.isProviderEnabled("EMAIL_PASSWORD_PROVIDER") || this.isProviderEnabled("PHONE_PROVIDER");
  }
};
async function getRecaptchaConfig(e, t) {
  return _performApiRequest(e, "GET", "/v2/recaptchaConfig", _addTidIfNecessary(e, t));
}
async function getAccountInfo(e, t) {
  return _performApiRequest(e, "POST", "/v1/accounts:lookup", t);
}
function utcTimestampToDateString(e) {
  if (e) try {
    const t = new Date(Number(e));
    if (!isNaN(t.getTime())) return t.toUTCString();
  } catch (e2) {
  }
}
async function getIdTokenResult(e, t = false) {
  const r = getModularInstance(e), n = await r.getIdToken(t), i = _parseToken(n);
  _assert(i && i.exp && i.auth_time && i.iat, r.auth, "internal-error");
  const s2 = "object" == typeof i.firebase ? i.firebase : void 0, o2 = s2?.sign_in_provider;
  return { claims: i, token: n, authTime: utcTimestampToDateString(secondsStringToMilliseconds(i.auth_time)), issuedAtTime: utcTimestampToDateString(secondsStringToMilliseconds(i.iat)), expirationTime: utcTimestampToDateString(secondsStringToMilliseconds(i.exp)), signInProvider: o2 || null, signInSecondFactor: s2?.sign_in_second_factor || null };
}
function secondsStringToMilliseconds(e) {
  return 1e3 * Number(e);
}
function _parseToken(e) {
  const [t, r, n] = e.split(".");
  if (void 0 === t || void 0 === r || void 0 === n) return _logError("JWT malformed, contained fewer than 3 sections"), null;
  try {
    const e2 = base64Decode2(r);
    return e2 ? JSON.parse(e2) : (_logError("Failed to decode base64 JWT payload"), null);
  } catch (e2) {
    return _logError("Caught error parsing JWT payload as JSON", e2?.toString()), null;
  }
}
function _tokenExpiresIn(e) {
  const t = _parseToken(e);
  return _assert(t, "internal-error"), _assert(void 0 !== t.exp, "internal-error"), _assert(void 0 !== t.iat, "internal-error"), Number(t.exp) - Number(t.iat);
}
async function _logoutIfInvalidated(e, t, r = false) {
  if (r) return t;
  try {
    return await t;
  } catch (t2) {
    throw _isUserInvalidated(t2) && e.auth.currentUser === e && await e.auth.signOut(), t2;
  }
}
function _isUserInvalidated(e) {
  return e instanceof FirebaseError2 && ("auth/user-disabled" === e.code || "auth/user-token-expired" === e.code);
}
var ProactiveRefresh = class {
  constructor(e) {
    this.user = e, this.isRunning = false, this.timerId = null, this.errorBackoff = 3e4;
  }
  _start() {
    this.isRunning || (this.isRunning = true, this.schedule());
  }
  _stop() {
    this.isRunning && (this.isRunning = false, null !== this.timerId && clearTimeout(this.timerId));
  }
  getInterval(e) {
    if (e) {
      const e2 = this.errorBackoff;
      return this.errorBackoff = Math.min(2 * this.errorBackoff, 96e4), e2;
    }
    {
      this.errorBackoff = 3e4;
      const e2 = (this.user.stsTokenManager.expirationTime ?? 0) - Date.now() - 3e5;
      return Math.max(0, e2);
    }
  }
  schedule(e = false) {
    if (!this.isRunning) return;
    const t = this.getInterval(e);
    this.timerId = setTimeout((async () => {
      await this.iteration();
    }), t);
  }
  async iteration() {
    try {
      await this.user.getIdToken(true);
    } catch (e) {
      return void ("auth/network-request-failed" === e?.code && this.schedule(true));
    }
    this.schedule();
  }
};
var UserMetadata = class {
  constructor(e, t) {
    this.createdAt = e, this.lastLoginAt = t, this._initializeTime();
  }
  _initializeTime() {
    this.lastSignInTime = utcTimestampToDateString(this.lastLoginAt), this.creationTime = utcTimestampToDateString(this.createdAt);
  }
  _copy(e) {
    this.createdAt = e.createdAt, this.lastLoginAt = e.lastLoginAt, this._initializeTime();
  }
  toJSON() {
    return { createdAt: this.createdAt, lastLoginAt: this.lastLoginAt };
  }
};
async function _reloadWithoutSaving(e) {
  const t = e.auth, r = await e.getIdToken(), n = await _logoutIfInvalidated(e, getAccountInfo(t, { idToken: r }));
  _assert(n?.users.length, t, "internal-error");
  const i = n.users[0];
  e._notifyReloadListener(i);
  const s2 = i.providerUserInfo?.length ? extractProviderData(i.providerUserInfo) : [], o2 = (function mergeProviderData(e2, t2) {
    return [...e2.filter(((e3) => !t2.some(((t3) => t3.providerId === e3.providerId)))), ...t2];
  })(e.providerData, s2), a2 = e.isAnonymous, c2 = !(e.email && i.passwordHash || o2?.length), u2 = !!a2 && c2, d2 = { uid: i.localId, displayName: i.displayName || null, photoURL: i.photoUrl || null, email: i.email || null, emailVerified: i.emailVerified || false, phoneNumber: i.phoneNumber || null, tenantId: i.tenantId || null, providerData: o2, metadata: new UserMetadata(i.createdAt, i.lastLoginAt), isAnonymous: u2 };
  Object.assign(e, d2);
}
async function reload(e) {
  const t = getModularInstance(e);
  await _reloadWithoutSaving(t), await t.auth._persistUserIfCurrent(t), t.auth._notifyListenersIfCurrent(t);
}
function extractProviderData(e) {
  return e.map((({ providerId: e2, ...t }) => ({ providerId: e2, uid: t.rawId || "", displayName: t.displayName || null, email: t.email || null, phoneNumber: t.phoneNumber || null, photoURL: t.photoUrl || null })));
}
var StsTokenManager = class _StsTokenManager {
  constructor() {
    this.refreshToken = null, this.accessToken = null, this.expirationTime = null;
  }
  get isExpired() {
    return !this.expirationTime || Date.now() > this.expirationTime - 3e5;
  }
  updateFromServerResponse(e) {
    _assert(e.idToken, "internal-error"), _assert(void 0 !== e.idToken, "internal-error"), _assert(void 0 !== e.refreshToken, "internal-error");
    const t = "expiresIn" in e && void 0 !== e.expiresIn ? Number(e.expiresIn) : _tokenExpiresIn(e.idToken);
    this.updateTokensAndExpiration(e.idToken, e.refreshToken, t);
  }
  updateFromIdToken(e) {
    _assert(0 !== e.length, "internal-error");
    const t = _tokenExpiresIn(e);
    this.updateTokensAndExpiration(e, null, t);
  }
  async getToken(e, t = false) {
    return t || !this.accessToken || this.isExpired ? (_assert(this.refreshToken, e, "user-token-expired"), this.refreshToken ? (await this.refresh(e, this.refreshToken), this.accessToken) : null) : this.accessToken;
  }
  clearRefreshToken() {
    this.refreshToken = null;
  }
  async refresh(e, t) {
    const { accessToken: r, refreshToken: n, expiresIn: i } = await (async function requestStsToken(e2, t2) {
      const r2 = await _performFetchWithErrorHandling(e2, {}, (async () => {
        const r3 = querystring({ grant_type: "refresh_token", refresh_token: t2 }).slice(1), { tokenApiHost: n2, apiKey: i2 } = e2.config, s2 = await _getFinalTarget(e2, n2, "/v1/token", `key=${i2}`), o2 = await e2._getAdditionalHeaders();
        o2["Content-Type"] = "application/x-www-form-urlencoded";
        const a2 = { method: "POST", headers: o2, body: r3 };
        return e2.emulatorConfig && isCloudWorkstation(e2.emulatorConfig.host) && (a2.credentials = "include"), FetchProvider.fetch()(s2, a2);
      }));
      return { accessToken: r2.access_token, expiresIn: r2.expires_in, refreshToken: r2.refresh_token };
    })(e, t);
    this.updateTokensAndExpiration(r, n, Number(i));
  }
  updateTokensAndExpiration(e, t, r) {
    this.refreshToken = t || null, this.accessToken = e || null, this.expirationTime = Date.now() + 1e3 * r;
  }
  static fromJSON(e, t) {
    const { refreshToken: r, accessToken: n, expirationTime: i } = t, s2 = new _StsTokenManager();
    return r && (_assert("string" == typeof r, "internal-error", { appName: e }), s2.refreshToken = r), n && (_assert("string" == typeof n, "internal-error", { appName: e }), s2.accessToken = n), i && (_assert("number" == typeof i, "internal-error", { appName: e }), s2.expirationTime = i), s2;
  }
  toJSON() {
    return { refreshToken: this.refreshToken, accessToken: this.accessToken, expirationTime: this.expirationTime };
  }
  _assign(e) {
    this.accessToken = e.accessToken, this.refreshToken = e.refreshToken, this.expirationTime = e.expirationTime;
  }
  _clone() {
    return Object.assign(new _StsTokenManager(), this.toJSON());
  }
  _performRefresh() {
    return debugFail("not implemented");
  }
};
function assertStringOrUndefined(e, t) {
  _assert("string" == typeof e || void 0 === e, "internal-error", { appName: t });
}
var UserImpl = class _UserImpl {
  constructor({ uid: e, auth: t, stsTokenManager: r, ...n }) {
    this.providerId = "firebase", this.proactiveRefresh = new ProactiveRefresh(this), this.reloadUserInfo = null, this.reloadListener = null, this.uid = e, this.auth = t, this.stsTokenManager = r, this.accessToken = r.accessToken, this.displayName = n.displayName || null, this.email = n.email || null, this.emailVerified = n.emailVerified || false, this.phoneNumber = n.phoneNumber || null, this.photoURL = n.photoURL || null, this.isAnonymous = n.isAnonymous || false, this.tenantId = n.tenantId || null, this.providerData = n.providerData ? [...n.providerData] : [], this.metadata = new UserMetadata(n.createdAt || void 0, n.lastLoginAt || void 0);
  }
  async getIdToken(e) {
    const t = await _logoutIfInvalidated(this, this.stsTokenManager.getToken(this.auth, e));
    return _assert(t, this.auth, "internal-error"), this.accessToken !== t && (this.accessToken = t, await this.auth._persistUserIfCurrent(this), this.auth._notifyListenersIfCurrent(this)), t;
  }
  getIdTokenResult(e) {
    return getIdTokenResult(this, e);
  }
  reload() {
    return reload(this);
  }
  _assign(e) {
    this !== e && (_assert(this.uid === e.uid, this.auth, "internal-error"), this.displayName = e.displayName, this.photoURL = e.photoURL, this.email = e.email, this.emailVerified = e.emailVerified, this.phoneNumber = e.phoneNumber, this.isAnonymous = e.isAnonymous, this.tenantId = e.tenantId, this.providerData = e.providerData.map(((e2) => ({ ...e2 }))), this.metadata._copy(e.metadata), this.stsTokenManager._assign(e.stsTokenManager));
  }
  _clone(e) {
    const t = new _UserImpl({ ...this, auth: e, stsTokenManager: this.stsTokenManager._clone() });
    return t.metadata._copy(this.metadata), t;
  }
  _onReload(e) {
    _assert(!this.reloadListener, this.auth, "internal-error"), this.reloadListener = e, this.reloadUserInfo && (this._notifyReloadListener(this.reloadUserInfo), this.reloadUserInfo = null);
  }
  _notifyReloadListener(e) {
    this.reloadListener ? this.reloadListener(e) : this.reloadUserInfo = e;
  }
  _startProactiveRefresh() {
    this.proactiveRefresh._start();
  }
  _stopProactiveRefresh() {
    this.proactiveRefresh._stop();
  }
  async _updateTokensIfNecessary(e, t = false) {
    let r = false;
    e.idToken && e.idToken !== this.stsTokenManager.accessToken && (this.stsTokenManager.updateFromServerResponse(e), r = true), t && await _reloadWithoutSaving(this), await this.auth._persistUserIfCurrent(this), r && this.auth._notifyListenersIfCurrent(this);
  }
  async delete() {
    if (_isFirebaseServerApp(this.auth.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this.auth));
    const e = await this.getIdToken();
    return await _logoutIfInvalidated(this, (async function deleteAccount(e2, t) {
      return _performApiRequest(e2, "POST", "/v1/accounts:delete", t);
    })(this.auth, { idToken: e })), this.stsTokenManager.clearRefreshToken(), this.auth.signOut();
  }
  toJSON() {
    return { uid: this.uid, email: this.email || void 0, emailVerified: this.emailVerified, displayName: this.displayName || void 0, isAnonymous: this.isAnonymous, photoURL: this.photoURL || void 0, phoneNumber: this.phoneNumber || void 0, tenantId: this.tenantId || void 0, providerData: this.providerData.map(((e) => ({ ...e }))), stsTokenManager: this.stsTokenManager.toJSON(), _redirectEventId: this._redirectEventId, ...this.metadata.toJSON(), apiKey: this.auth.config.apiKey, appName: this.auth.name };
  }
  get refreshToken() {
    return this.stsTokenManager.refreshToken || "";
  }
  static _fromJSON(e, t) {
    const r = t.displayName ?? void 0, n = t.email ?? void 0, i = t.phoneNumber ?? void 0, s2 = t.photoURL ?? void 0, o2 = t.tenantId ?? void 0, a2 = t._redirectEventId ?? void 0, c2 = t.createdAt ?? void 0, u2 = t.lastLoginAt ?? void 0, { uid: d2, emailVerified: l2, isAnonymous: h, providerData: p, stsTokenManager: f } = t;
    _assert(d2 && f, e, "internal-error");
    const m = StsTokenManager.fromJSON(this.name, f);
    _assert("string" == typeof d2, e, "internal-error"), assertStringOrUndefined(r, e.name), assertStringOrUndefined(n, e.name), _assert("boolean" == typeof l2, e, "internal-error"), _assert("boolean" == typeof h, e, "internal-error"), assertStringOrUndefined(i, e.name), assertStringOrUndefined(s2, e.name), assertStringOrUndefined(o2, e.name), assertStringOrUndefined(a2, e.name), assertStringOrUndefined(c2, e.name), assertStringOrUndefined(u2, e.name);
    const g = new _UserImpl({ uid: d2, auth: e, email: n, emailVerified: l2, displayName: r, isAnonymous: h, photoURL: s2, phoneNumber: i, tenantId: o2, stsTokenManager: m, createdAt: c2, lastLoginAt: u2 });
    return p && Array.isArray(p) && (g.providerData = p.map(((e2) => ({ ...e2 })))), a2 && (g._redirectEventId = a2), g;
  }
  static async _fromIdTokenResponse(e, t, r = false) {
    const n = new StsTokenManager();
    n.updateFromServerResponse(t);
    const i = new _UserImpl({ uid: t.localId, auth: e, stsTokenManager: n, isAnonymous: r });
    return await _reloadWithoutSaving(i), i;
  }
  static async _fromGetAccountInfoResponse(e, t, r) {
    const n = t.users[0];
    _assert(void 0 !== n.localId, "internal-error");
    const i = void 0 !== n.providerUserInfo ? extractProviderData(n.providerUserInfo) : [], s2 = !(n.email && n.passwordHash || i?.length), o2 = new StsTokenManager();
    o2.updateFromIdToken(r);
    const a2 = new _UserImpl({ uid: n.localId, auth: e, stsTokenManager: o2, isAnonymous: s2 }), c2 = { uid: n.localId, displayName: n.displayName || null, photoURL: n.photoUrl || null, email: n.email || null, emailVerified: n.emailVerified || false, phoneNumber: n.phoneNumber || null, tenantId: n.tenantId || null, providerData: i, metadata: new UserMetadata(n.createdAt, n.lastLoginAt), isAnonymous: !(n.email && n.passwordHash || i?.length) };
    return Object.assign(a2, c2), a2;
  }
};
var P = /* @__PURE__ */ new Map();
function _getInstance(e) {
  debugAssert(e instanceof Function, "Expected a class definition");
  let t = P.get(e);
  return t ? (debugAssert(t instanceof e, "Instance stored in cache mismatched with class"), t) : (t = new e(), P.set(e, t), t);
}
var InMemoryPersistence = class {
  constructor() {
    this.type = "NONE", this.storage = {};
  }
  async _isAvailable() {
    return true;
  }
  async _set(e, t) {
    this.storage[e] = t;
  }
  async _get(e) {
    const t = this.storage[e];
    return void 0 === t ? null : t;
  }
  async _remove(e) {
    delete this.storage[e];
  }
  _addListener(e, t) {
  }
  _removeListener(e, t) {
  }
};
InMemoryPersistence.type = "NONE";
var S = InMemoryPersistence;
function _persistenceKeyName(e, t, r) {
  return `firebase:${e}:${t}:${r}`;
}
var PersistenceUserManager = class _PersistenceUserManager {
  constructor(e, t, r) {
    this.persistence = e, this.auth = t, this.userKey = r;
    const { config: n, name: i } = this.auth;
    this.fullUserKey = _persistenceKeyName(this.userKey, n.apiKey, i), this.fullPersistenceKey = _persistenceKeyName("persistence", n.apiKey, i), this.boundEventHandler = t._onStorageEvent.bind(t);
    try {
      this.persistence._addListener(this.fullUserKey, this.boundEventHandler);
    } catch {
    }
  }
  setCurrentUser(e) {
    return this.persistence._set(this.fullUserKey, e.toJSON());
  }
  async getCurrentUser() {
    const e = await this.persistence._get(this.fullUserKey);
    if (!e) return null;
    if ("string" == typeof e) {
      const t = await getAccountInfo(this.auth, { idToken: e }).catch((() => {
      }));
      return t ? UserImpl._fromGetAccountInfoResponse(this.auth, t, e) : null;
    }
    return UserImpl._fromJSON(this.auth, e);
  }
  removeCurrentUser() {
    return this.persistence._remove(this.fullUserKey);
  }
  savePersistenceForRedirect() {
    return this.persistence._set(this.fullPersistenceKey, this.persistence.type);
  }
  async setPersistence(e) {
    if (this.persistence === e) return;
    const t = await this.getCurrentUser();
    return await this.removeCurrentUser(), this.persistence = e, t ? this.setCurrentUser(t) : void 0;
  }
  delete() {
    try {
      this.persistence._removeListener(this.fullUserKey, this.boundEventHandler);
    } catch {
    }
  }
  static async create(e, t, r = "authUser") {
    if (!t.length) return new _PersistenceUserManager(_getInstance(S), e, r);
    const n = (await Promise.all(t.map((async (e2) => {
      try {
        if (await e2._isAvailable()) return e2;
      } catch {
        return;
      }
    })))).filter(((e2) => e2));
    let i = n[0] || _getInstance(S);
    const s2 = _persistenceKeyName(r, e.config.apiKey, e.name);
    let o2 = null;
    for (const r2 of t) try {
      const t2 = await r2._get(s2);
      if (t2) {
        let n2;
        if ("string" == typeof t2) {
          const r3 = await getAccountInfo(e, { idToken: t2 }).catch((() => {
          }));
          if (!r3) break;
          n2 = await UserImpl._fromGetAccountInfoResponse(e, r3, t2);
        } else n2 = UserImpl._fromJSON(e, t2);
        r2 !== i && (o2 = n2), i = r2;
        break;
      }
    } catch {
    }
    const a2 = n.filter(((e2) => e2._shouldAllowMigration));
    return i._shouldAllowMigration && a2.length ? (i = a2[0], o2 && await i._set(s2, o2.toJSON()), await Promise.all(t.map((async (e2) => {
      if (e2 !== i) try {
        await e2._remove(s2);
      } catch {
      }
    }))), new _PersistenceUserManager(i, e, r)) : new _PersistenceUserManager(i, e, r);
  }
};
function _getBrowserName(e) {
  const t = e.toLowerCase();
  if (t.includes("opera/") || t.includes("opr/") || t.includes("opios/")) return "Opera";
  if (_isIEMobile(t)) return "IEMobile";
  if (t.includes("msie") || t.includes("trident/")) return "IE";
  if (t.includes("edge/")) return "Edge";
  if (_isFirefox(t)) return "Firefox";
  if (t.includes("silk/")) return "Silk";
  if (_isBlackBerry(t)) return "Blackberry";
  if (_isWebOS(t)) return "Webos";
  if (_isSafari(t)) return "Safari";
  if ((t.includes("chrome/") || _isChromeIOS(t)) && !t.includes("edge/")) return "Chrome";
  if (_isAndroid(t)) return "Android";
  {
    const t2 = /([a-zA-Z\d\.]+)\/[a-zA-Z\d\.]*$/, r = e.match(t2);
    if (2 === r?.length) return r[1];
  }
  return "Other";
}
function _isFirefox(e = getUA()) {
  return /firefox\//i.test(e);
}
function _isSafari(e = getUA()) {
  const t = e.toLowerCase();
  return t.includes("safari/") && !t.includes("chrome/") && !t.includes("crios/") && !t.includes("android");
}
function _isChromeIOS(e = getUA()) {
  return /crios\//i.test(e);
}
function _isIEMobile(e = getUA()) {
  return /iemobile/i.test(e);
}
function _isAndroid(e = getUA()) {
  return /android/i.test(e);
}
function _isBlackBerry(e = getUA()) {
  return /blackberry/i.test(e);
}
function _isWebOS(e = getUA()) {
  return /webos/i.test(e);
}
function _isIOS(e = getUA()) {
  return /iphone|ipad|ipod/i.test(e) || /macintosh/i.test(e) && /mobile/i.test(e);
}
function _isIE10() {
  return (function isIE() {
    const e = getUA();
    return e.indexOf("MSIE ") >= 0 || e.indexOf("Trident/") >= 0;
  })() && 10 === document.documentMode;
}
function _isMobileBrowser(e = getUA()) {
  return _isIOS(e) || _isAndroid(e) || _isWebOS(e) || _isBlackBerry(e) || /windows phone/i.test(e) || _isIEMobile(e);
}
function _getClientVersion(e, t = []) {
  let n;
  switch (e) {
    case "Browser":
      n = _getBrowserName(getUA());
      break;
    case "Worker":
      n = `${_getBrowserName(getUA())}-${e}`;
      break;
    default:
      n = e;
  }
  const i = t.length ? t.join(",") : "FirebaseCore-web";
  return `${n}/JsCore/${SDK_VERSION}/${i}`;
}
var AuthMiddlewareQueue = class {
  constructor(e) {
    this.auth = e, this.queue = [];
  }
  pushCallback(e, t) {
    const wrappedCallback = (t2) => new Promise(((r2, n) => {
      try {
        r2(e(t2));
      } catch (e2) {
        n(e2);
      }
    }));
    wrappedCallback.onAbort = t, this.queue.push(wrappedCallback);
    const r = this.queue.length - 1;
    return () => {
      this.queue[r] = () => Promise.resolve();
    };
  }
  async runMiddleware(e) {
    if (this.auth.currentUser === e) return;
    const t = [];
    try {
      for (const r of this.queue) await r(e), r.onAbort && t.push(r.onAbort);
    } catch (e2) {
      t.reverse();
      for (const e3 of t) try {
        e3();
      } catch (e4) {
      }
      throw this.auth._errorFactory.create("login-blocked", { originalMessage: e2?.message });
    }
  }
};
var PasswordPolicyImpl = class {
  constructor(e) {
    const t = e.customStrengthOptions;
    this.customStrengthOptions = {}, this.customStrengthOptions.minPasswordLength = t.minPasswordLength ?? 6, t.maxPasswordLength && (this.customStrengthOptions.maxPasswordLength = t.maxPasswordLength), void 0 !== t.containsLowercaseCharacter && (this.customStrengthOptions.containsLowercaseLetter = t.containsLowercaseCharacter), void 0 !== t.containsUppercaseCharacter && (this.customStrengthOptions.containsUppercaseLetter = t.containsUppercaseCharacter), void 0 !== t.containsNumericCharacter && (this.customStrengthOptions.containsNumericCharacter = t.containsNumericCharacter), void 0 !== t.containsNonAlphanumericCharacter && (this.customStrengthOptions.containsNonAlphanumericCharacter = t.containsNonAlphanumericCharacter), this.enforcementState = e.enforcementState, "ENFORCEMENT_STATE_UNSPECIFIED" === this.enforcementState && (this.enforcementState = "OFF"), this.allowedNonAlphanumericCharacters = e.allowedNonAlphanumericCharacters?.join("") ?? "", this.forceUpgradeOnSignin = e.forceUpgradeOnSignin ?? false, this.schemaVersion = e.schemaVersion;
  }
  validatePassword(e) {
    const t = { isValid: true, passwordPolicy: this };
    return this.validatePasswordLengthOptions(e, t), this.validatePasswordCharacterOptions(e, t), t.isValid && (t.isValid = t.meetsMinPasswordLength ?? true), t.isValid && (t.isValid = t.meetsMaxPasswordLength ?? true), t.isValid && (t.isValid = t.containsLowercaseLetter ?? true), t.isValid && (t.isValid = t.containsUppercaseLetter ?? true), t.isValid && (t.isValid = t.containsNumericCharacter ?? true), t.isValid && (t.isValid = t.containsNonAlphanumericCharacter ?? true), t;
  }
  validatePasswordLengthOptions(e, t) {
    const r = this.customStrengthOptions.minPasswordLength, n = this.customStrengthOptions.maxPasswordLength;
    r && (t.meetsMinPasswordLength = e.length >= r), n && (t.meetsMaxPasswordLength = e.length <= n);
  }
  validatePasswordCharacterOptions(e, t) {
    let r;
    this.updatePasswordCharacterOptionsStatuses(t, false, false, false, false);
    for (let n = 0; n < e.length; n++) r = e.charAt(n), this.updatePasswordCharacterOptionsStatuses(t, r >= "a" && r <= "z", r >= "A" && r <= "Z", r >= "0" && r <= "9", this.allowedNonAlphanumericCharacters.includes(r));
  }
  updatePasswordCharacterOptionsStatuses(e, t, r, n, i) {
    this.customStrengthOptions.containsLowercaseLetter && (e.containsLowercaseLetter || (e.containsLowercaseLetter = t)), this.customStrengthOptions.containsUppercaseLetter && (e.containsUppercaseLetter || (e.containsUppercaseLetter = r)), this.customStrengthOptions.containsNumericCharacter && (e.containsNumericCharacter || (e.containsNumericCharacter = n)), this.customStrengthOptions.containsNonAlphanumericCharacter && (e.containsNonAlphanumericCharacter || (e.containsNonAlphanumericCharacter = i));
  }
};
var AuthImpl = class {
  constructor(e, t, r, n) {
    this.app = e, this.heartbeatServiceProvider = t, this.appCheckServiceProvider = r, this.config = n, this.currentUser = null, this.emulatorConfig = null, this.operations = Promise.resolve(), this.authStateSubscription = new Subscription(this), this.idTokenSubscription = new Subscription(this), this.beforeStateQueue = new AuthMiddlewareQueue(this), this.redirectUser = null, this.isProactiveRefreshEnabled = false, this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION = 1, this._canInitEmulator = true, this._isInitialized = false, this._deleted = false, this._initializationPromise = null, this._popupRedirectResolver = null, this._errorFactory = v, this._agentRecaptchaConfig = null, this._tenantRecaptchaConfigs = {}, this._projectPasswordPolicy = null, this._tenantPasswordPolicies = {}, this._resolvePersistenceManagerAvailable = void 0, this.lastNotifiedUid = void 0, this.languageCode = null, this.tenantId = null, this.settings = { appVerificationDisabledForTesting: false }, this.frameworks = [], this.name = e.name, this.clientVersion = n.sdkClientVersion, this._persistenceManagerAvailable = new Promise(((e2) => this._resolvePersistenceManagerAvailable = e2));
  }
  _initializeWithPersistence(e, t) {
    return t && (this._popupRedirectResolver = _getInstance(t)), this._initializationPromise = this.queue((async () => {
      if (!this._deleted) {
        try {
          this.persistenceManager = await PersistenceUserManager.create(this, e);
        } catch (e2) {
          _logWarn(`Failed to initialize persistence: ${e2}`), this.persistenceManager = await PersistenceUserManager.create(this, []);
        } finally {
          this._resolvePersistenceManagerAvailable?.();
        }
        if (!this._deleted) {
          if (this._popupRedirectResolver?._shouldInitProactively) try {
            await this._popupRedirectResolver._initialize(this);
          } catch (e2) {
          }
          try {
            await this.initializeCurrentUser(t);
          } catch (e2) {
            _logWarn(`Failed to initialize current user: ${e2}`), await this.directlySetCurrentUser(null).catch((() => {
            }));
          }
          this.lastNotifiedUid = this.currentUser?.uid || null, this._deleted || (this._isInitialized = true);
        }
      }
    })), this._initializationPromise;
  }
  async _onStorageEvent() {
    if (this._deleted) return;
    const e = await this.assertedPersistence.getCurrentUser();
    return this.currentUser || e ? this.currentUser && e && this.currentUser.uid === e.uid ? (this._currentUser._assign(e), void await this.currentUser.getIdToken()) : void await this._updateCurrentUser(e, true) : void 0;
  }
  async initializeCurrentUserFromIdToken(e) {
    try {
      const t = await getAccountInfo(this, { idToken: e }), r = await UserImpl._fromGetAccountInfoResponse(this, t, e);
      await this.directlySetCurrentUser(r);
    } catch (e2) {
      console.warn("FirebaseServerApp could not login user with provided authIdToken: ", e2), await this.directlySetCurrentUser(null);
    }
  }
  async initializeCurrentUser(e) {
    if (_isFirebaseServerApp(this.app)) {
      const e2 = this.app.settings.authIdToken;
      return e2 ? new Promise(((t2) => {
        setTimeout((() => this.initializeCurrentUserFromIdToken(e2).then(t2, t2)));
      })) : this.directlySetCurrentUser(null);
    }
    const t = await this.assertedPersistence.getCurrentUser();
    let r = t, i = false;
    if (e && this.config.authDomain) {
      await this.getOrInitRedirectPersistenceManager();
      const t2 = this.redirectUser?._redirectEventId, n = r?._redirectEventId, s2 = await this.tryRedirectSignIn(e);
      t2 && t2 !== n || !s2?.user || (r = s2.user, i = true);
    }
    if (!r) return this.directlySetCurrentUser(null);
    if (!r._redirectEventId) {
      if (i) try {
        await this.beforeStateQueue.runMiddleware(r);
      } catch (e2) {
        r = t, this._popupRedirectResolver._overrideRedirectResult(this, (() => Promise.reject(e2)));
      }
      return r ? this.reloadAndSetCurrentUserOrClear(r) : this.directlySetCurrentUser(null);
    }
    return _assert(this._popupRedirectResolver, this, "argument-error"), await this.getOrInitRedirectPersistenceManager(), this.redirectUser && this.redirectUser._redirectEventId === r._redirectEventId ? this.directlySetCurrentUser(r) : this.reloadAndSetCurrentUserOrClear(r);
  }
  async tryRedirectSignIn(e) {
    let t = null;
    try {
      t = await this._popupRedirectResolver._completeRedirectFn(this, e, true);
    } catch (e2) {
      await this._setRedirectUser(null);
    }
    return t;
  }
  async reloadAndSetCurrentUserOrClear(e) {
    try {
      await _reloadWithoutSaving(e);
    } catch (e2) {
      if (_isUserInvalidated(e2)) return this.directlySetCurrentUser(null);
    }
    return this.directlySetCurrentUser(e);
  }
  useDeviceLanguage() {
    this.languageCode = (function _getUserLanguage() {
      if ("undefined" == typeof navigator) return null;
      const e = navigator;
      return e.languages && e.languages[0] || e.language || null;
    })();
  }
  async _delete() {
    this._deleted = true;
  }
  async updateCurrentUser(e) {
    if (_isFirebaseServerApp(this.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this));
    const t = e ? getModularInstance(e) : null;
    return t && _assert(t.auth.config.apiKey === this.config.apiKey, this, "invalid-user-token"), this._updateCurrentUser(t && t._clone(this));
  }
  async _updateCurrentUser(e, t = false) {
    if (!this._deleted) return e && _assert(this.tenantId === e.tenantId, this, "tenant-id-mismatch"), t || await this.beforeStateQueue.runMiddleware(e), this.queue((async () => {
      await this.directlySetCurrentUser(e), this.notifyAuthListeners();
    }));
  }
  async signOut() {
    return _isFirebaseServerApp(this.app) ? Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this)) : (await this.beforeStateQueue.runMiddleware(null), (this.redirectPersistenceManager || this._popupRedirectResolver) && await this._setRedirectUser(null), this._updateCurrentUser(null, true));
  }
  setPersistence(e) {
    return _isFirebaseServerApp(this.app) ? Promise.reject(_serverAppCurrentUserOperationNotSupportedError(this)) : this.queue((async () => {
      await this.assertedPersistence.setPersistence(_getInstance(e));
    }));
  }
  _getRecaptchaConfig() {
    return null == this.tenantId ? this._agentRecaptchaConfig : this._tenantRecaptchaConfigs[this.tenantId];
  }
  async validatePassword(e) {
    this._getPasswordPolicyInternal() || await this._updatePasswordPolicy();
    const t = this._getPasswordPolicyInternal();
    return t.schemaVersion !== this.EXPECTED_PASSWORD_POLICY_SCHEMA_VERSION ? Promise.reject(this._errorFactory.create("unsupported-password-policy-schema-version", {})) : t.validatePassword(e);
  }
  _getPasswordPolicyInternal() {
    return null === this.tenantId ? this._projectPasswordPolicy : this._tenantPasswordPolicies[this.tenantId];
  }
  async _updatePasswordPolicy() {
    const e = await (async function _getPasswordPolicy(e2, t2 = {}) {
      return _performApiRequest(e2, "GET", "/v2/passwordPolicy", _addTidIfNecessary(e2, t2));
    })(this), t = new PasswordPolicyImpl(e);
    null === this.tenantId ? this._projectPasswordPolicy = t : this._tenantPasswordPolicies[this.tenantId] = t;
  }
  _getPersistenceType() {
    return this.assertedPersistence.persistence.type;
  }
  _getPersistence() {
    return this.assertedPersistence.persistence;
  }
  _updateErrorMap(e) {
    this._errorFactory = new ErrorFactory2("auth", "Firebase", e());
  }
  onAuthStateChanged(e, t, r) {
    return this.registerStateListener(this.authStateSubscription, e, t, r);
  }
  beforeAuthStateChanged(e, t) {
    return this.beforeStateQueue.pushCallback(e, t);
  }
  onIdTokenChanged(e, t, r) {
    return this.registerStateListener(this.idTokenSubscription, e, t, r);
  }
  authStateReady() {
    return new Promise(((e, t) => {
      if (this.currentUser) e();
      else {
        const r = this.onAuthStateChanged((() => {
          r(), e();
        }), t);
      }
    }));
  }
  async revokeAccessToken(e) {
    if (this.currentUser) {
      const t = { providerId: "apple.com", tokenType: "ACCESS_TOKEN", token: e, idToken: await this.currentUser.getIdToken() };
      null != this.tenantId && (t.tenantId = this.tenantId), await (async function revokeToken(e2, t2) {
        return _performApiRequest(e2, "POST", "/v2/accounts:revokeToken", _addTidIfNecessary(e2, t2));
      })(this, t);
    }
  }
  toJSON() {
    return { apiKey: this.config.apiKey, authDomain: this.config.authDomain, appName: this.name, currentUser: this._currentUser?.toJSON() };
  }
  async _setRedirectUser(e, t) {
    const r = await this.getOrInitRedirectPersistenceManager(t);
    return null === e ? r.removeCurrentUser() : r.setCurrentUser(e);
  }
  async getOrInitRedirectPersistenceManager(e) {
    if (!this.redirectPersistenceManager) {
      const t = e && _getInstance(e) || this._popupRedirectResolver;
      _assert(t, this, "argument-error"), this.redirectPersistenceManager = await PersistenceUserManager.create(this, [_getInstance(t._redirectPersistence)], "redirectUser"), this.redirectUser = await this.redirectPersistenceManager.getCurrentUser();
    }
    return this.redirectPersistenceManager;
  }
  async _redirectUserForId(e) {
    return this._isInitialized && await this.queue((async () => {
    })), this._currentUser?._redirectEventId === e ? this._currentUser : this.redirectUser?._redirectEventId === e ? this.redirectUser : null;
  }
  async _persistUserIfCurrent(e) {
    if (e === this.currentUser) return this.queue((async () => this.directlySetCurrentUser(e)));
  }
  _notifyListenersIfCurrent(e) {
    e === this.currentUser && this.notifyAuthListeners();
  }
  _key() {
    return `${this.config.authDomain}:${this.config.apiKey}:${this.name}`;
  }
  _startProactiveRefresh() {
    this.isProactiveRefreshEnabled = true, this.currentUser && this._currentUser._startProactiveRefresh();
  }
  _stopProactiveRefresh() {
    this.isProactiveRefreshEnabled = false, this.currentUser && this._currentUser._stopProactiveRefresh();
  }
  get _currentUser() {
    return this.currentUser;
  }
  notifyAuthListeners() {
    if (!this._isInitialized) return;
    this.idTokenSubscription.next(this.currentUser);
    const e = this.currentUser?.uid ?? null;
    this.lastNotifiedUid !== e && (this.lastNotifiedUid = e, this.authStateSubscription.next(this.currentUser));
  }
  registerStateListener(e, t, r, n) {
    if (this._deleted) return () => {
    };
    const i = "function" == typeof t ? t : t.next.bind(t);
    let s2 = false;
    const o2 = this._isInitialized ? Promise.resolve() : this._initializationPromise;
    if (_assert(o2, this, "internal-error"), o2.then((() => {
      s2 || i(this.currentUser);
    })).catch(((e2) => {
      if (!s2) if ("function" != typeof t && t.error) t.error(e2);
      else {
        if (!r) throw e2;
        r(e2);
      }
    })), "function" == typeof t) {
      const i2 = e.addObserver(t, r, n);
      return () => {
        s2 = true, i2();
      };
    }
    {
      const r2 = e.addObserver(t);
      return () => {
        s2 = true, r2();
      };
    }
  }
  async directlySetCurrentUser(e) {
    if (this.currentUser && this.currentUser !== e && this._currentUser._stopProactiveRefresh(), e && this.isProactiveRefreshEnabled && e._startProactiveRefresh(), this.currentUser = e, this.persistenceManager) try {
      e ? await this.persistenceManager.setCurrentUser(e) : await this.persistenceManager.removeCurrentUser();
    } catch (e2) {
      const t = _errorWithCustomMessage(this, "internal-error", `An internal AuthError has occurred: ${e2?.message || String(e2)}`);
      throw t.customData = { originalError: e2 }, t;
    }
  }
  queue(e) {
    return this.operations = this.operations.then(e, e), this.operations;
  }
  get assertedPersistence() {
    return _assert(this.persistenceManager, this, "internal-error"), this.persistenceManager;
  }
  _logFramework(e) {
    e && !this.frameworks.includes(e) && (this.frameworks.push(e), this.frameworks.sort(), this.clientVersion = _getClientVersion(this.config.clientPlatform, this._getFrameworks()));
  }
  _getFrameworks() {
    return this.frameworks;
  }
  async _getAdditionalHeaders() {
    const e = { "X-Client-Version": this.clientVersion };
    this.app.options.appId && (e["X-Firebase-gmpid"] = this.app.options.appId);
    const t = await this.heartbeatServiceProvider.getImmediate({ optional: true })?.getHeartbeatsHeader();
    t && (e["X-Firebase-Client"] = t);
    const r = await this._getAppCheckToken();
    return r && (e["X-Firebase-AppCheck"] = r), e;
  }
  async _getAppCheckToken() {
    if (_isFirebaseServerApp(this.app) && this.app.settings.appCheckToken) return this.app.settings.appCheckToken;
    const e = await this.appCheckServiceProvider.getImmediate({ optional: true })?.getToken();
    return e?.error && _logWarn(`Error while retrieving App Check token: ${e.error}`), e?.token;
  }
};
function _castAuth(e) {
  return getModularInstance(e);
}
var Subscription = class {
  constructor(e) {
    this.auth = e, this.observer = null, this.addObserver = (function createSubscribe(e2, t) {
      const r = new ObserverProxy(e2, t);
      return r.subscribe.bind(r);
    })(((e2) => this.observer = e2));
  }
  get next() {
    return _assert(this.observer, this.auth, "internal-error"), this.observer.next.bind(this.observer);
  }
};
var R = { async loadJS() {
  throw new Error("Unable to load external scripts");
}, recaptchaV2Script: "", recaptchaEnterpriseScript: "", gapiScript: "" };
function _loadJS(e) {
  return R.loadJS(e);
}
function _generateCallbackName(e) {
  return `__${e}${Math.floor(1e6 * Math.random())}`;
}
var MockGreCAPTCHATopLevel = class {
  constructor() {
    this.enterprise = new MockGreCAPTCHA();
  }
  ready(e) {
    e();
  }
  execute(e, t) {
    return Promise.resolve("token");
  }
  render(e, t) {
    return "";
  }
};
var MockGreCAPTCHA = class {
  ready(e) {
    e();
  }
  execute(e, t) {
    return Promise.resolve("token");
  }
  render(e, t) {
    return "";
  }
};
var C = "NO_RECAPTCHA";
var b = "onFirebaseAuthREInstanceReady";
var RecaptchaEnterpriseVerifier = class _RecaptchaEnterpriseVerifier {
  constructor(e) {
    this.type = "recaptcha-enterprise", this.auth = _castAuth(e);
  }
  async verify(e = "verify", t = false) {
    function retrieveRecaptchaToken(t2, r, n) {
      const i = window.grecaptcha;
      isEnterprise(i) ? i.enterprise.ready((() => {
        i.enterprise.execute(t2, { action: e }).then(((e2) => {
          r(e2);
        })).catch((() => {
          r(C);
        }));
      })) : n(Error("No reCAPTCHA enterprise script loaded."));
    }
    if (this.auth.settings.appVerificationDisabledForTesting) {
      return new MockGreCAPTCHATopLevel().execute("siteKey", { action: "verify" });
    }
    return new Promise(((e2, r) => {
      (async function retrieveSiteKey(e3) {
        if (!t) {
          if (null == e3.tenantId && null != e3._agentRecaptchaConfig) return e3._agentRecaptchaConfig.siteKey;
          if (null != e3.tenantId && void 0 !== e3._tenantRecaptchaConfigs[e3.tenantId]) return e3._tenantRecaptchaConfigs[e3.tenantId].siteKey;
        }
        return new Promise((async (t2, r2) => {
          getRecaptchaConfig(e3, { clientType: "CLIENT_TYPE_WEB", version: "RECAPTCHA_ENTERPRISE" }).then(((n) => {
            if (void 0 !== n.recaptchaKey) {
              const r3 = new RecaptchaConfig(n);
              return null == e3.tenantId ? e3._agentRecaptchaConfig = r3 : e3._tenantRecaptchaConfigs[e3.tenantId] = r3, t2(r3.siteKey);
            }
            r2(new Error("recaptcha Enterprise site key undefined"));
          })).catch(((e4) => {
            r2(e4);
          }));
        }));
      })(this.auth).then((async (n) => {
        if (!t && isEnterprise(window.grecaptcha) && _RecaptchaEnterpriseVerifier.scriptInjectionDeferred) await _RecaptchaEnterpriseVerifier.scriptInjectionDeferred.promise, retrieveRecaptchaToken(n, e2, r);
        else {
          if ("undefined" == typeof window) return void r(new Error("RecaptchaVerifier is only supported in browser"));
          let t2 = (function _recaptchaEnterpriseScriptUrl() {
            return R.recaptchaEnterpriseScript;
          })();
          0 !== t2.length && (t2 += n + `&onload=${b}`), _RecaptchaEnterpriseVerifier.scriptInjectionDeferred = new Deferred2(), window[b] = () => {
            _RecaptchaEnterpriseVerifier.scriptInjectionDeferred?.resolve();
          }, _loadJS(t2).then((() => _RecaptchaEnterpriseVerifier.scriptInjectionDeferred?.promise)).then((() => {
            retrieveRecaptchaToken(n, e2, r);
          })).catch(((e3) => {
            r(e3);
          }));
        }
      })).catch(((e3) => {
        r(e3);
      }));
    }));
  }
};
async function injectRecaptchaFields(e, t, r, n = false, i = false) {
  const s2 = new RecaptchaEnterpriseVerifier(e);
  let o2;
  if (i) o2 = C;
  else try {
    o2 = await s2.verify(r);
  } catch (e2) {
    o2 = await s2.verify(r, true);
  }
  const a2 = { ...t };
  if ("mfaSmsEnrollment" === r || "mfaSmsSignIn" === r) {
    if ("phoneEnrollmentInfo" in a2) {
      const e2 = a2.phoneEnrollmentInfo.phoneNumber, t2 = a2.phoneEnrollmentInfo.recaptchaToken;
      Object.assign(a2, { phoneEnrollmentInfo: { phoneNumber: e2, recaptchaToken: t2, captchaResponse: o2, clientType: "CLIENT_TYPE_WEB", recaptchaVersion: "RECAPTCHA_ENTERPRISE" } });
    } else if ("phoneSignInInfo" in a2) {
      const e2 = a2.phoneSignInInfo.recaptchaToken;
      Object.assign(a2, { phoneSignInInfo: { recaptchaToken: e2, captchaResponse: o2, clientType: "CLIENT_TYPE_WEB", recaptchaVersion: "RECAPTCHA_ENTERPRISE" } });
    }
    return a2;
  }
  return n ? Object.assign(a2, { captchaResp: o2 }) : Object.assign(a2, { captchaResponse: o2 }), Object.assign(a2, { clientType: "CLIENT_TYPE_WEB" }), Object.assign(a2, { recaptchaVersion: "RECAPTCHA_ENTERPRISE" }), a2;
}
async function handleRecaptchaFlow(e, t, r, n, i) {
  if ("EMAIL_PASSWORD_PROVIDER" === i) {
    if (e._getRecaptchaConfig()?.isProviderEnabled("EMAIL_PASSWORD_PROVIDER")) {
      const i2 = await injectRecaptchaFields(e, t, r, "getOobCode" === r);
      return n(e, i2);
    }
    return n(e, t).catch((async (i2) => {
      if ("auth/missing-recaptcha-token" === i2.code) {
        console.log(`${r} is protected by reCAPTCHA Enterprise for this project. Automatically triggering the reCAPTCHA flow and restarting the flow.`);
        const i3 = await injectRecaptchaFields(e, t, r, "getOobCode" === r);
        return n(e, i3);
      }
      return Promise.reject(i2);
    }));
  }
  if ("PHONE_PROVIDER" === i) {
    if (e._getRecaptchaConfig()?.isProviderEnabled("PHONE_PROVIDER")) {
      const i2 = await injectRecaptchaFields(e, t, r);
      return n(e, i2).catch((async (i3) => {
        if ("AUDIT" === e._getRecaptchaConfig()?.getProviderEnforcementState("PHONE_PROVIDER") && ("auth/missing-recaptcha-token" === i3.code || "auth/invalid-app-credential" === i3.code)) {
          console.log(`Failed to verify with reCAPTCHA Enterprise. Automatically triggering the reCAPTCHA v2 flow to complete the ${r} flow.`);
          const i4 = await injectRecaptchaFields(e, t, r, false, true);
          return n(e, i4);
        }
        return Promise.reject(i3);
      }));
    }
    {
      const i2 = await injectRecaptchaFields(e, t, r, false, true);
      return n(e, i2);
    }
  }
  return Promise.reject(i + " provider is not supported.");
}
async function _initializeRecaptchaConfig(e) {
  const t = _castAuth(e), r = await getRecaptchaConfig(t, { clientType: "CLIENT_TYPE_WEB", version: "RECAPTCHA_ENTERPRISE" }), n = new RecaptchaConfig(r);
  if (null == t.tenantId ? t._agentRecaptchaConfig = n : t._tenantRecaptchaConfigs[t.tenantId] = n, n.isAnyProviderEnabled()) {
    new RecaptchaEnterpriseVerifier(t).verify().catch((() => {
    }));
  }
}
function initializeAuth(e, t) {
  const r = _getProvider(e, "auth");
  if (r.isInitialized()) {
    const e2 = r.getImmediate();
    if (deepEqual2(r.getOptions(), t ?? {})) return e2;
    _fail(e2, "already-initialized");
  }
  return r.initialize({ options: t });
}
RecaptchaEnterpriseVerifier.scriptInjectionDeferred = null;
var AuthCredential = class {
  constructor(e, t) {
    this.providerId = e, this.signInMethod = t;
  }
  toJSON() {
    return debugFail("not implemented");
  }
  _getIdTokenResponse(e) {
    return debugFail("not implemented");
  }
  _linkToIdToken(e, t) {
    return debugFail("not implemented");
  }
  _getReauthenticationResolver(e) {
    return debugFail("not implemented");
  }
};
async function linkEmailPassword(e, t) {
  return _performApiRequest(e, "POST", "/v1/accounts:signUp", t);
}
async function signInWithPassword(e, t) {
  return _performSignInRequest(e, "POST", "/v1/accounts:signInWithPassword", _addTidIfNecessary(e, t));
}
var EmailAuthCredential = class _EmailAuthCredential extends AuthCredential {
  constructor(e, t, r, n = null) {
    super("password", r), this._email = e, this._password = t, this._tenantId = n;
  }
  static _fromEmailAndPassword(e, t) {
    return new _EmailAuthCredential(e, t, "password");
  }
  static _fromEmailAndCode(e, t, r = null) {
    return new _EmailAuthCredential(e, t, "emailLink", r);
  }
  toJSON() {
    return { email: this._email, password: this._password, signInMethod: this.signInMethod, tenantId: this._tenantId };
  }
  static fromJSON(e) {
    const t = "string" == typeof e ? JSON.parse(e) : e;
    if (t?.email && t?.password) {
      if ("password" === t.signInMethod) return this._fromEmailAndPassword(t.email, t.password);
      if ("emailLink" === t.signInMethod) return this._fromEmailAndCode(t.email, t.password, t.tenantId);
    }
    return null;
  }
  async _getIdTokenResponse(e) {
    switch (this.signInMethod) {
      case "password":
        return handleRecaptchaFlow(e, { returnSecureToken: true, email: this._email, password: this._password, clientType: "CLIENT_TYPE_WEB" }, "signInWithPassword", signInWithPassword, "EMAIL_PASSWORD_PROVIDER");
      case "emailLink":
        return (async function signInWithEmailLink$1(e2, t) {
          return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithEmailLink", _addTidIfNecessary(e2, t));
        })(e, { email: this._email, oobCode: this._password });
      default:
        _fail(e, "internal-error");
    }
  }
  async _linkToIdToken(e, t) {
    switch (this.signInMethod) {
      case "password":
        return handleRecaptchaFlow(e, { idToken: t, returnSecureToken: true, email: this._email, password: this._password, clientType: "CLIENT_TYPE_WEB" }, "signUpPassword", linkEmailPassword, "EMAIL_PASSWORD_PROVIDER");
      case "emailLink":
        return (async function signInWithEmailLinkForLinking(e2, t2) {
          return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithEmailLink", _addTidIfNecessary(e2, t2));
        })(e, { idToken: t, email: this._email, oobCode: this._password });
      default:
        _fail(e, "internal-error");
    }
  }
  _getReauthenticationResolver(e) {
    return this._getIdTokenResponse(e);
  }
};
async function signInWithIdp(e, t) {
  return _performSignInRequest(e, "POST", "/v1/accounts:signInWithIdp", _addTidIfNecessary(e, t));
}
var OAuthCredential = class _OAuthCredential extends AuthCredential {
  constructor() {
    super(...arguments), this.pendingToken = null;
  }
  static _fromParams(e) {
    const t = new _OAuthCredential(e.providerId, e.signInMethod);
    return e.idToken || e.accessToken ? (e.idToken && (t.idToken = e.idToken), e.accessToken && (t.accessToken = e.accessToken), e.nonce && !e.pendingToken && (t.nonce = e.nonce), e.pendingToken && (t.pendingToken = e.pendingToken)) : e.oauthToken && e.oauthTokenSecret ? (t.accessToken = e.oauthToken, t.secret = e.oauthTokenSecret) : _fail("argument-error"), t;
  }
  toJSON() {
    return { idToken: this.idToken, accessToken: this.accessToken, secret: this.secret, nonce: this.nonce, pendingToken: this.pendingToken, providerId: this.providerId, signInMethod: this.signInMethod };
  }
  static fromJSON(e) {
    const t = "string" == typeof e ? JSON.parse(e) : e, { providerId: r, signInMethod: n, ...i } = t;
    if (!r || !n) return null;
    const s2 = new _OAuthCredential(r, n);
    return s2.idToken = i.idToken || void 0, s2.accessToken = i.accessToken || void 0, s2.secret = i.secret, s2.nonce = i.nonce, s2.pendingToken = i.pendingToken || null, s2;
  }
  _getIdTokenResponse(e) {
    return signInWithIdp(e, this.buildRequest());
  }
  _linkToIdToken(e, t) {
    const r = this.buildRequest();
    return r.idToken = t, signInWithIdp(e, r);
  }
  _getReauthenticationResolver(e) {
    const t = this.buildRequest();
    return t.autoCreate = false, signInWithIdp(e, t);
  }
  buildRequest() {
    const e = { requestUri: "http://localhost", returnSecureToken: true };
    if (this.pendingToken) e.pendingToken = this.pendingToken;
    else {
      const t = {};
      this.idToken && (t.id_token = this.idToken), this.accessToken && (t.access_token = this.accessToken), this.secret && (t.oauth_token_secret = this.secret), t.providerId = this.providerId, this.nonce && !this.pendingToken && (t.nonce = this.nonce), e.postBody = querystring(t);
    }
    return e;
  }
};
async function sendPhoneVerificationCode(e, t) {
  return _performApiRequest(e, "POST", "/v1/accounts:sendVerificationCode", _addTidIfNecessary(e, t));
}
var N = { USER_NOT_FOUND: "user-not-found" };
var PhoneAuthCredential = class _PhoneAuthCredential extends AuthCredential {
  constructor(e) {
    super("phone", "phone"), this.params = e;
  }
  static _fromVerification(e, t) {
    return new _PhoneAuthCredential({ verificationId: e, verificationCode: t });
  }
  static _fromTokenResponse(e, t) {
    return new _PhoneAuthCredential({ phoneNumber: e, temporaryProof: t });
  }
  _getIdTokenResponse(e) {
    return (async function signInWithPhoneNumber$1(e2, t) {
      return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithPhoneNumber", _addTidIfNecessary(e2, t));
    })(e, this._makeVerificationRequest());
  }
  _linkToIdToken(e, t) {
    return (async function linkWithPhoneNumber$1(e2, t2) {
      const r = await _performSignInRequest(e2, "POST", "/v1/accounts:signInWithPhoneNumber", _addTidIfNecessary(e2, t2));
      if (r.temporaryProof) throw _makeTaggedError(e2, "account-exists-with-different-credential", r);
      return r;
    })(e, { idToken: t, ...this._makeVerificationRequest() });
  }
  _getReauthenticationResolver(e) {
    return (async function verifyPhoneNumberForExisting(e2, t) {
      return _performSignInRequest(e2, "POST", "/v1/accounts:signInWithPhoneNumber", _addTidIfNecessary(e2, { ...t, operation: "REAUTH" }), N);
    })(e, this._makeVerificationRequest());
  }
  _makeVerificationRequest() {
    const { temporaryProof: e, phoneNumber: t, verificationId: r, verificationCode: n } = this.params;
    return e && t ? { temporaryProof: e, phoneNumber: t } : { sessionInfo: r, code: n };
  }
  toJSON() {
    const e = { providerId: this.providerId };
    return this.params.phoneNumber && (e.phoneNumber = this.params.phoneNumber), this.params.temporaryProof && (e.temporaryProof = this.params.temporaryProof), this.params.verificationCode && (e.verificationCode = this.params.verificationCode), this.params.verificationId && (e.verificationId = this.params.verificationId), e;
  }
  static fromJSON(e) {
    "string" == typeof e && (e = JSON.parse(e));
    const { verificationId: t, verificationCode: r, phoneNumber: n, temporaryProof: i } = e;
    return r || t || n || i ? new _PhoneAuthCredential({ verificationId: t, verificationCode: r, phoneNumber: n, temporaryProof: i }) : null;
  }
};
var ActionCodeURL = class _ActionCodeURL {
  constructor(e) {
    const t = querystringDecode(extractQuerystring(e)), r = t.apiKey ?? null, n = t.oobCode ?? null, i = (function parseMode(e2) {
      switch (e2) {
        case "recoverEmail":
          return "RECOVER_EMAIL";
        case "resetPassword":
          return "PASSWORD_RESET";
        case "signIn":
          return "EMAIL_SIGNIN";
        case "verifyEmail":
          return "VERIFY_EMAIL";
        case "verifyAndChangeEmail":
          return "VERIFY_AND_CHANGE_EMAIL";
        case "revertSecondFactorAddition":
          return "REVERT_SECOND_FACTOR_ADDITION";
        default:
          return null;
      }
    })(t.mode ?? null);
    _assert(r && n && i, "argument-error"), this.apiKey = r, this.operation = i, this.code = n, this.continueUrl = t.continueUrl ?? null, this.languageCode = t.lang ?? null, this.tenantId = t.tenantId ?? null;
  }
  static parseLink(e) {
    const t = (function parseDeepLink(e2) {
      const t2 = querystringDecode(extractQuerystring(e2)).link, r = t2 ? querystringDecode(extractQuerystring(t2)).deep_link_id : null, n = querystringDecode(extractQuerystring(e2)).deep_link_id;
      return (n ? querystringDecode(extractQuerystring(n)).link : null) || n || r || t2 || e2;
    })(e);
    try {
      return new _ActionCodeURL(t);
    } catch {
      return null;
    }
  }
};
var EmailAuthProvider = class _EmailAuthProvider {
  constructor() {
    this.providerId = _EmailAuthProvider.PROVIDER_ID;
  }
  static credential(e, t) {
    return EmailAuthCredential._fromEmailAndPassword(e, t);
  }
  static credentialWithLink(e, t) {
    const r = ActionCodeURL.parseLink(t);
    return _assert(r, "argument-error"), EmailAuthCredential._fromEmailAndCode(e, r.code, r.tenantId);
  }
};
EmailAuthProvider.PROVIDER_ID = "password", EmailAuthProvider.EMAIL_PASSWORD_SIGN_IN_METHOD = "password", EmailAuthProvider.EMAIL_LINK_SIGN_IN_METHOD = "emailLink";
var FederatedAuthProvider = class {
  constructor(e) {
    this.providerId = e, this.defaultLanguageCode = null, this.customParameters = {};
  }
  setDefaultLanguage(e) {
    this.defaultLanguageCode = e;
  }
  setCustomParameters(e) {
    return this.customParameters = e, this;
  }
  getCustomParameters() {
    return this.customParameters;
  }
};
var BaseOAuthProvider = class extends FederatedAuthProvider {
  constructor() {
    super(...arguments), this.scopes = [];
  }
  addScope(e) {
    return this.scopes.includes(e) || this.scopes.push(e), this;
  }
  getScopes() {
    return [...this.scopes];
  }
};
var FacebookAuthProvider = class _FacebookAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("facebook.com");
  }
  static credential(e) {
    return OAuthCredential._fromParams({ providerId: _FacebookAuthProvider.PROVIDER_ID, signInMethod: _FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD, accessToken: e });
  }
  static credentialFromResult(e) {
    return _FacebookAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _FacebookAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e || !("oauthAccessToken" in e)) return null;
    if (!e.oauthAccessToken) return null;
    try {
      return _FacebookAuthProvider.credential(e.oauthAccessToken);
    } catch {
      return null;
    }
  }
};
FacebookAuthProvider.FACEBOOK_SIGN_IN_METHOD = "facebook.com", FacebookAuthProvider.PROVIDER_ID = "facebook.com";
var GoogleAuthProvider = class _GoogleAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("google.com"), this.addScope("profile");
  }
  static credential(e, t) {
    return OAuthCredential._fromParams({ providerId: _GoogleAuthProvider.PROVIDER_ID, signInMethod: _GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD, idToken: e, accessToken: t });
  }
  static credentialFromResult(e) {
    return _GoogleAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _GoogleAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e) return null;
    const { oauthIdToken: t, oauthAccessToken: r } = e;
    if (!t && !r) return null;
    try {
      return _GoogleAuthProvider.credential(t, r);
    } catch {
      return null;
    }
  }
};
GoogleAuthProvider.GOOGLE_SIGN_IN_METHOD = "google.com", GoogleAuthProvider.PROVIDER_ID = "google.com";
var GithubAuthProvider = class _GithubAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("github.com");
  }
  static credential(e) {
    return OAuthCredential._fromParams({ providerId: _GithubAuthProvider.PROVIDER_ID, signInMethod: _GithubAuthProvider.GITHUB_SIGN_IN_METHOD, accessToken: e });
  }
  static credentialFromResult(e) {
    return _GithubAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _GithubAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e || !("oauthAccessToken" in e)) return null;
    if (!e.oauthAccessToken) return null;
    try {
      return _GithubAuthProvider.credential(e.oauthAccessToken);
    } catch {
      return null;
    }
  }
};
GithubAuthProvider.GITHUB_SIGN_IN_METHOD = "github.com", GithubAuthProvider.PROVIDER_ID = "github.com";
var TwitterAuthProvider = class _TwitterAuthProvider extends BaseOAuthProvider {
  constructor() {
    super("twitter.com");
  }
  static credential(e, t) {
    return OAuthCredential._fromParams({ providerId: _TwitterAuthProvider.PROVIDER_ID, signInMethod: _TwitterAuthProvider.TWITTER_SIGN_IN_METHOD, oauthToken: e, oauthTokenSecret: t });
  }
  static credentialFromResult(e) {
    return _TwitterAuthProvider.credentialFromTaggedObject(e);
  }
  static credentialFromError(e) {
    return _TwitterAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e) return null;
    const { oauthAccessToken: t, oauthTokenSecret: r } = e;
    if (!t || !r) return null;
    try {
      return _TwitterAuthProvider.credential(t, r);
    } catch {
      return null;
    }
  }
};
TwitterAuthProvider.TWITTER_SIGN_IN_METHOD = "twitter.com", TwitterAuthProvider.PROVIDER_ID = "twitter.com";
var UserCredentialImpl = class _UserCredentialImpl {
  constructor(e) {
    this.user = e.user, this.providerId = e.providerId, this._tokenResponse = e._tokenResponse, this.operationType = e.operationType;
  }
  static async _fromIdTokenResponse(e, t, r, n = false) {
    const i = await UserImpl._fromIdTokenResponse(e, r, n), s2 = providerIdForResponse(r);
    return new _UserCredentialImpl({ user: i, providerId: s2, _tokenResponse: r, operationType: t });
  }
  static async _forOperation(e, t, r) {
    await e._updateTokensIfNecessary(r, true);
    const n = providerIdForResponse(r);
    return new _UserCredentialImpl({ user: e, providerId: n, _tokenResponse: r, operationType: t });
  }
};
function providerIdForResponse(e) {
  return e.providerId ? e.providerId : "phoneNumber" in e ? "phone" : null;
}
var MultiFactorError = class _MultiFactorError extends FirebaseError2 {
  constructor(e, t, r, n) {
    super(t.code, t.message), this.operationType = r, this.user = n, Object.setPrototypeOf(this, _MultiFactorError.prototype), this.customData = { appName: e.name, tenantId: e.tenantId ?? void 0, _serverResponse: t.customData._serverResponse, operationType: r };
  }
  static _fromErrorAndOperation(e, t, r, n) {
    return new _MultiFactorError(e, t, r, n);
  }
};
function _processCredentialSavingMfaContextIfNecessary(e, t, r, n) {
  return ("reauthenticate" === t ? r._getReauthenticationResolver(e) : r._getIdTokenResponse(e)).catch(((r2) => {
    if ("auth/multi-factor-auth-required" === r2.code) throw MultiFactorError._fromErrorAndOperation(e, r2, t, n);
    throw r2;
  }));
}
async function _link$1(e, t, r = false) {
  const n = await _logoutIfInvalidated(e, t._linkToIdToken(e.auth, await e.getIdToken()), r);
  return UserCredentialImpl._forOperation(e, "link", n);
}
async function _reauthenticate(e, t, r = false) {
  const { auth: i } = e;
  if (_isFirebaseServerApp(i.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(i));
  const s2 = "reauthenticate";
  try {
    const n = await _logoutIfInvalidated(e, _processCredentialSavingMfaContextIfNecessary(i, s2, t, e), r);
    _assert(n.idToken, i, "internal-error");
    const o2 = _parseToken(n.idToken);
    _assert(o2, i, "internal-error");
    const { sub: a2 } = o2;
    return _assert(e.uid === a2, i, "user-mismatch"), UserCredentialImpl._forOperation(e, s2, n);
  } catch (e2) {
    throw "auth/user-not-found" === e2?.code && _fail(i, "user-mismatch"), e2;
  }
}
async function _signInWithCredential(e, t, r = false) {
  if (_isFirebaseServerApp(e.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(e));
  const i = "signIn", s2 = await _processCredentialSavingMfaContextIfNecessary(e, i, t), o2 = await UserCredentialImpl._fromIdTokenResponse(e, i, s2);
  return r || await e._updateCurrentUser(o2.user), o2;
}
function signOut(e) {
  return getModularInstance(e).signOut();
}
function startEnrollPhoneMfa(e, t) {
  return _performApiRequest(e, "POST", "/v2/accounts/mfaEnrollment:start", _addTidIfNecessary(e, t));
}
var D = "__sak";
var BrowserPersistenceClass = class {
  constructor(e, t) {
    this.storageRetriever = e, this.type = t;
  }
  _isAvailable() {
    try {
      return this.storage ? (this.storage.setItem(D, "1"), this.storage.removeItem(D), Promise.resolve(true)) : Promise.resolve(false);
    } catch {
      return Promise.resolve(false);
    }
  }
  _set(e, t) {
    return this.storage.setItem(e, JSON.stringify(t)), Promise.resolve();
  }
  _get(e) {
    const t = this.storage.getItem(e);
    return Promise.resolve(t ? JSON.parse(t) : null);
  }
  _remove(e) {
    return this.storage.removeItem(e), Promise.resolve();
  }
  get storage() {
    return this.storageRetriever();
  }
};
var BrowserLocalPersistence = class extends BrowserPersistenceClass {
  constructor() {
    super((() => window.localStorage), "LOCAL"), this.boundEventHandler = (e, t) => this.onStorageEvent(e, t), this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.fallbackToPolling = _isMobileBrowser(), this._shouldAllowMigration = true;
  }
  forAllChangedKeys(e) {
    for (const t of Object.keys(this.listeners)) {
      const r = this.storage.getItem(t), n = this.localCache[t];
      r !== n && e(t, n, r);
    }
  }
  onStorageEvent(e, t = false) {
    if (!e.key) return void this.forAllChangedKeys(((e2, t2, r2) => {
      this.notifyListeners(e2, r2);
    }));
    const r = e.key;
    t ? this.detachListener() : this.stopPolling();
    const triggerListeners = () => {
      const e2 = this.storage.getItem(r);
      (t || this.localCache[r] !== e2) && this.notifyListeners(r, e2);
    }, n = this.storage.getItem(r);
    _isIE10() && n !== e.newValue && e.newValue !== e.oldValue ? setTimeout(triggerListeners, 10) : triggerListeners();
  }
  notifyListeners(e, t) {
    this.localCache[e] = t;
    const r = this.listeners[e];
    if (r) for (const e2 of Array.from(r)) e2(t ? JSON.parse(t) : t);
  }
  startPolling() {
    this.stopPolling(), this.pollTimer = setInterval((() => {
      this.forAllChangedKeys(((e, t, r) => {
        this.onStorageEvent(new StorageEvent("storage", { key: e, oldValue: t, newValue: r }), true);
      }));
    }), 1e3);
  }
  stopPolling() {
    this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
  }
  attachListener() {
    window.addEventListener("storage", this.boundEventHandler);
  }
  detachListener() {
    window.removeEventListener("storage", this.boundEventHandler);
  }
  _addListener(e, t) {
    0 === Object.keys(this.listeners).length && (this.fallbackToPolling ? this.startPolling() : this.attachListener()), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this.localCache[e] = this.storage.getItem(e)), this.listeners[e].add(t);
  }
  _removeListener(e, t) {
    this.listeners[e] && (this.listeners[e].delete(t), 0 === this.listeners[e].size && delete this.listeners[e]), 0 === Object.keys(this.listeners).length && (this.detachListener(), this.stopPolling());
  }
  async _set(e, t) {
    await super._set(e, t), this.localCache[e] = JSON.stringify(t);
  }
  async _get(e) {
    const t = await super._get(e);
    return this.localCache[e] = JSON.stringify(t), t;
  }
  async _remove(e) {
    await super._remove(e), delete this.localCache[e];
  }
};
BrowserLocalPersistence.type = "LOCAL";
function getDocumentCookie(e) {
  const t = e.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&"), r = RegExp(`${t}=([^;]+)`);
  return document.cookie.match(r)?.[1] ?? null;
}
function getCookieName(e) {
  return `${"http:" === window.location.protocol ? "__dev_" : "__HOST-"}FIREBASE_${e.split(":")[3]}`;
}
var CookiePersistence = class {
  constructor() {
    this.type = "COOKIE", this.listenerUnsubscribes = /* @__PURE__ */ new Map();
  }
  _getFinalTarget(e) {
    if (void 0 === typeof window) return e;
    const t = new URL(`${window.location.origin}/__cookies__`);
    return t.searchParams.set("finalTarget", e), t;
  }
  async _isAvailable() {
    return !("boolean" == typeof isSecureContext && !isSecureContext) && ("undefined" != typeof navigator && "undefined" != typeof document && (navigator.cookieEnabled ?? true));
  }
  async _set(e, t) {
  }
  async _get(e) {
    if (!this._isAvailable()) return null;
    const t = getCookieName(e);
    if (window.cookieStore) {
      const e2 = await window.cookieStore.get(t);
      return e2?.value;
    }
    return getDocumentCookie(t);
  }
  async _remove(e) {
    if (!this._isAvailable()) return;
    if (!await this._get(e)) return;
    const t = getCookieName(e);
    document.cookie = `${t}=;Max-Age=34560000;Partitioned;Secure;SameSite=Strict;Path=/;Priority=High`, await fetch("/__cookies__", { method: "DELETE" }).catch((() => {
    }));
  }
  _addListener(e, t) {
    if (!this._isAvailable()) return;
    const r = getCookieName(e);
    if (window.cookieStore) {
      const cb = (e2) => {
        const n2 = e2.changed.find(((e3) => e3.name === r));
        n2 && t(n2.value);
        e2.deleted.find(((e3) => e3.name === r)) && t(null);
      }, unsubscribe = () => window.cookieStore.removeEventListener("change", cb);
      return this.listenerUnsubscribes.set(t, unsubscribe), window.cookieStore.addEventListener("change", cb);
    }
    let n = getDocumentCookie(r);
    const i = setInterval((() => {
      const e2 = getDocumentCookie(r);
      e2 !== n && (t(e2), n = e2);
    }), 1e3);
    this.listenerUnsubscribes.set(t, (() => clearInterval(i)));
  }
  _removeListener(e, t) {
    const r = this.listenerUnsubscribes.get(t);
    r && (r(), this.listenerUnsubscribes.delete(t));
  }
};
CookiePersistence.type = "COOKIE";
var BrowserSessionPersistence = class extends BrowserPersistenceClass {
  constructor() {
    super((() => window.sessionStorage), "SESSION");
  }
  _addListener(e, t) {
  }
  _removeListener(e, t) {
  }
};
BrowserSessionPersistence.type = "SESSION";
var U = BrowserSessionPersistence;
var Receiver = class _Receiver {
  constructor(e) {
    this.eventTarget = e, this.handlersMap = {}, this.boundEventHandler = this.handleEvent.bind(this);
  }
  static _getInstance(e) {
    const t = this.receivers.find(((t2) => t2.isListeningto(e)));
    if (t) return t;
    const r = new _Receiver(e);
    return this.receivers.push(r), r;
  }
  isListeningto(e) {
    return this.eventTarget === e;
  }
  async handleEvent(e) {
    const t = e, { eventId: r, eventType: n, data: i } = t.data, s2 = this.handlersMap[n];
    if (!s2?.size) return;
    t.ports[0].postMessage({ status: "ack", eventId: r, eventType: n });
    const o2 = Array.from(s2).map((async (e2) => e2(t.origin, i))), a2 = await (function _allSettled(e2) {
      return Promise.all(e2.map((async (e3) => {
        try {
          return { fulfilled: true, value: await e3 };
        } catch (e4) {
          return { fulfilled: false, reason: e4 };
        }
      })));
    })(o2);
    t.ports[0].postMessage({ status: "done", eventId: r, eventType: n, response: a2 });
  }
  _subscribe(e, t) {
    0 === Object.keys(this.handlersMap).length && this.eventTarget.addEventListener("message", this.boundEventHandler), this.handlersMap[e] || (this.handlersMap[e] = /* @__PURE__ */ new Set()), this.handlersMap[e].add(t);
  }
  _unsubscribe(e, t) {
    this.handlersMap[e] && t && this.handlersMap[e].delete(t), t && 0 !== this.handlersMap[e].size || delete this.handlersMap[e], 0 === Object.keys(this.handlersMap).length && this.eventTarget.removeEventListener("message", this.boundEventHandler);
  }
};
function _generateEventId(e = "", t = 10) {
  let r = "";
  for (let e2 = 0; e2 < t; e2++) r += Math.floor(10 * Math.random());
  return e + r;
}
Receiver.receivers = [];
var Sender = class {
  constructor(e) {
    this.target = e, this.handlers = /* @__PURE__ */ new Set();
  }
  removeMessageHandler(e) {
    e.messageChannel && (e.messageChannel.port1.removeEventListener("message", e.onMessage), e.messageChannel.port1.close()), this.handlers.delete(e);
  }
  async _send(e, t, r = 50) {
    const n = "undefined" != typeof MessageChannel ? new MessageChannel() : null;
    if (!n) throw new Error("connection_unavailable");
    let i, s2;
    return new Promise(((o2, a2) => {
      const c2 = _generateEventId("", 20);
      n.port1.start();
      const u2 = setTimeout((() => {
        a2(new Error("unsupported_event"));
      }), r);
      s2 = { messageChannel: n, onMessage(e2) {
        const t2 = e2;
        if (t2.data.eventId === c2) switch (t2.data.status) {
          case "ack":
            clearTimeout(u2), i = setTimeout((() => {
              a2(new Error("timeout"));
            }), 3e3);
            break;
          case "done":
            clearTimeout(i), o2(t2.data.response);
            break;
          default:
            clearTimeout(u2), clearTimeout(i), a2(new Error("invalid_response"));
        }
      } }, this.handlers.add(s2), n.port1.addEventListener("message", s2.onMessage), this.target.postMessage({ eventType: e, eventId: c2, data: t }, [n.port2]);
    })).finally((() => {
      s2 && this.removeMessageHandler(s2);
    }));
  }
};
function _window() {
  return window;
}
function _isWorker() {
  return void 0 !== _window().WorkerGlobalScope && "function" == typeof _window().importScripts;
}
var F = "firebaseLocalStorageDb";
var V = "firebaseLocalStorage";
var W = "fbase_key";
var DBPromise = class {
  constructor(e) {
    this.request = e;
  }
  toPromise() {
    return new Promise(((e, t) => {
      this.request.addEventListener("success", (() => {
        e(this.request.result);
      })), this.request.addEventListener("error", (() => {
        t(this.request.error);
      }));
    }));
  }
};
function getObjectStore(e, t) {
  return e.transaction([V], t ? "readwrite" : "readonly").objectStore(V);
}
function _openDatabase() {
  const e = indexedDB.open(F, 1);
  return new Promise(((t, r) => {
    e.addEventListener("error", (() => {
      r(e.error);
    })), e.addEventListener("upgradeneeded", (() => {
      const t2 = e.result;
      try {
        t2.createObjectStore(V, { keyPath: W });
      } catch (e2) {
        r(e2);
      }
    })), e.addEventListener("success", (async () => {
      const r2 = e.result;
      r2.objectStoreNames.contains(V) ? t(r2) : (r2.close(), await (function _deleteDatabase() {
        const e2 = indexedDB.deleteDatabase(F);
        return new DBPromise(e2).toPromise();
      })(), t(await _openDatabase()));
    }));
  }));
}
async function _putObject(e, t, r) {
  const n = getObjectStore(e, true).put({ [W]: t, value: r });
  return new DBPromise(n).toPromise();
}
function _deleteObject(e, t) {
  const r = getObjectStore(e, true).delete(t);
  return new DBPromise(r).toPromise();
}
var IndexedDBLocalPersistence = class {
  registerLifecycleListeners() {
    "undefined" != typeof window && "function" == typeof window.addEventListener && (window.addEventListener("pagehide", this.onPageHide), window.addEventListener("pageshow", this.onPageShow));
  }
  unregisterLifecycleListeners() {
    "undefined" != typeof window && "function" == typeof window.removeEventListener && (window.removeEventListener("pagehide", this.onPageHide), window.removeEventListener("pageshow", this.onPageShow));
  }
  constructor() {
    this.type = "LOCAL", this.dbPromise = null, this._shouldAllowMigration = true, this.listeners = {}, this.localCache = {}, this.pollTimer = null, this.isClosing = false, this.pendingWrites = 0, this.receiver = null, this.sender = null, this.serviceWorkerReceiverAvailable = false, this.activeServiceWorker = null, this.onPageHide = () => {
      this.isClosing = true, this.stopPolling(), this.dbPromise && (this.dbPromise.then(((e) => e.close())).catch((() => {
      })), this.dbPromise = null);
    }, this.onPageShow = () => {
      this.isClosing && (this.isClosing = false, Object.keys(this.listeners).length > 0 && this.startPolling());
    }, this._workerInitializationPromise = this.initializeServiceWorkerMessaging().then((() => {
    }), (() => {
    }));
  }
  async _openDb() {
    return this.dbPromise || (this.dbPromise = _openDatabase(), this.dbPromise.catch((() => {
      this.dbPromise = null;
    }))), this.dbPromise;
  }
  async _withRetries(e) {
    let t = 0;
    for (; ; ) try {
      const t2 = await this._openDb();
      return await e(t2);
    } catch (e2) {
      if (t++ > 3) throw e2;
      if (this.dbPromise) {
        const e3 = this.dbPromise;
        this.dbPromise = null;
        try {
          (await e3).close();
        } catch {
        }
      }
    }
  }
  async initializeServiceWorkerMessaging() {
    return _isWorker() ? this.initializeReceiver() : this.initializeSender();
  }
  async initializeReceiver() {
    this.receiver = Receiver._getInstance((function _getWorkerGlobalScope() {
      return _isWorker() ? self : null;
    })()), this.receiver._subscribe("keyChanged", (async (e, t) => ({ keyProcessed: (await this._poll()).includes(t.key) }))), this.receiver._subscribe("ping", (async (e, t) => ["keyChanged"]));
  }
  async initializeSender() {
    if (this.activeServiceWorker = await (async function _getActiveServiceWorker() {
      if (!navigator?.serviceWorker) return null;
      try {
        return (await navigator.serviceWorker.ready).active;
      } catch {
        return null;
      }
    })(), !this.activeServiceWorker) return;
    this.sender = new Sender(this.activeServiceWorker);
    const e = await this.sender._send("ping", {}, 800);
    e && e[0]?.fulfilled && e[0]?.value.includes("keyChanged") && (this.serviceWorkerReceiverAvailable = true);
  }
  async notifyServiceWorker(e) {
    if (this.sender && this.activeServiceWorker && (function _getServiceWorkerController() {
      return navigator?.serviceWorker?.controller || null;
    })() === this.activeServiceWorker) try {
      await this.sender._send("keyChanged", { key: e }, this.serviceWorkerReceiverAvailable ? 800 : 50);
    } catch {
    }
  }
  async _isAvailable() {
    try {
      return !!indexedDB && (await this._withRetries((async (e) => {
        await _putObject(e, D, "1"), await _deleteObject(e, D);
      })), true);
    } catch {
    }
    return false;
  }
  async _withPendingWrite(e) {
    this.pendingWrites++;
    try {
      await e();
    } finally {
      this.pendingWrites--;
    }
  }
  async _set(e, t) {
    return this._withPendingWrite((async () => (await this._withRetries(((r) => _putObject(r, e, t))), this.localCache[e] = t, this.notifyServiceWorker(e))));
  }
  async _get(e) {
    const t = await this._withRetries(((t2) => (async function getObject(e2, t3) {
      const r = getObjectStore(e2, false).get(t3), n = await new DBPromise(r).toPromise();
      return void 0 === n ? null : n.value;
    })(t2, e)));
    return this.localCache[e] = t, t;
  }
  async _remove(e) {
    return this._withPendingWrite((async () => (await this._withRetries(((t) => _deleteObject(t, e))), delete this.localCache[e], this.notifyServiceWorker(e))));
  }
  async _poll() {
    if (this.isClosing) return [];
    try {
      const e = await this._withRetries(((e2) => {
        const t2 = getObjectStore(e2, false).getAll();
        return new DBPromise(t2).toPromise();
      }));
      if (this.isClosing) return [];
      if (!e) return [];
      if (0 !== this.pendingWrites) return [];
      const t = [], r = /* @__PURE__ */ new Set();
      if (0 !== e.length) for (const { fbase_key: n, value: i } of e) r.add(n), JSON.stringify(this.localCache[n]) !== JSON.stringify(i) && (this.notifyListeners(n, i), t.push(n));
      for (const e2 of Object.keys(this.localCache)) this.localCache[e2] && !r.has(e2) && (this.notifyListeners(e2, null), t.push(e2));
      return t;
    } catch (e) {
      return this.isClosing || _logWarn(`Firebase Auth cross-tab polling failed with error: ${e}`), [];
    }
  }
  notifyListeners(e, t) {
    this.localCache[e] = t;
    const r = this.listeners[e];
    if (r) for (const e2 of Array.from(r)) e2(t);
  }
  startPolling() {
    this.stopPolling(), this.pollTimer = setInterval((async () => this._poll()), 800);
  }
  stopPolling() {
    this.pollTimer && (clearInterval(this.pollTimer), this.pollTimer = null);
  }
  _addListener(e, t) {
    0 === Object.keys(this.listeners).length && (this.startPolling(), this.registerLifecycleListeners()), this.listeners[e] || (this.listeners[e] = /* @__PURE__ */ new Set(), this._get(e).catch((() => {
    }))), this.listeners[e].add(t);
  }
  _removeListener(e, t) {
    this.listeners[e] && (this.listeners[e].delete(t), 0 === this.listeners[e].size && delete this.listeners[e]), 0 === Object.keys(this.listeners).length && (this.stopPolling(), this.unregisterLifecycleListeners());
  }
};
IndexedDBLocalPersistence.type = "LOCAL";
function startSignInPhoneMfa(e, t) {
  return _performApiRequest(e, "POST", "/v2/accounts/mfaSignIn:start", _addTidIfNecessary(e, t));
}
var H = _generateCallbackName("rcb");
var j = new Delay(3e4, 6e4);
var q = "recaptcha";
async function _verifyPhoneNumber(e, t, r) {
  if (!e._getRecaptchaConfig()) try {
    await _initializeRecaptchaConfig(e);
  } catch (e2) {
    console.log("Failed to initialize reCAPTCHA Enterprise config. Triggering the reCAPTCHA v2 verification.");
  }
  try {
    let n;
    if (n = "string" == typeof t ? { phoneNumber: t } : t, "session" in n) {
      const t2 = n.session;
      if ("phoneNumber" in n) {
        _assert("enroll" === t2.type, e, "internal-error");
        const i = { idToken: t2.credential, phoneEnrollmentInfo: { phoneNumber: n.phoneNumber, clientType: "CLIENT_TYPE_WEB" } }, s2 = handleRecaptchaFlow(e, i, "mfaSmsEnrollment", (async (e2, t3) => {
          if (t3.phoneEnrollmentInfo.captchaResponse === C) {
            _assert(r?.type === q, e2, "argument-error");
            return startEnrollPhoneMfa(e2, await injectRecaptchaV2Token(e2, t3, r));
          }
          return startEnrollPhoneMfa(e2, t3);
        }), "PHONE_PROVIDER");
        return (await s2.catch(((e2) => Promise.reject(e2)))).phoneSessionInfo.sessionInfo;
      }
      {
        _assert("signin" === t2.type, e, "internal-error");
        const i = n.multiFactorHint?.uid || n.multiFactorUid;
        _assert(i, e, "missing-multi-factor-info");
        const s2 = { mfaPendingCredential: t2.credential, mfaEnrollmentId: i, phoneSignInInfo: { clientType: "CLIENT_TYPE_WEB" } }, o2 = handleRecaptchaFlow(e, s2, "mfaSmsSignIn", (async (e2, t3) => {
          if (t3.phoneSignInInfo.captchaResponse === C) {
            _assert(r?.type === q, e2, "argument-error");
            return startSignInPhoneMfa(e2, await injectRecaptchaV2Token(e2, t3, r));
          }
          return startSignInPhoneMfa(e2, t3);
        }), "PHONE_PROVIDER");
        return (await o2.catch(((e2) => Promise.reject(e2)))).phoneResponseInfo.sessionInfo;
      }
    }
    {
      const t2 = { phoneNumber: n.phoneNumber, clientType: "CLIENT_TYPE_WEB" }, i = handleRecaptchaFlow(e, t2, "sendVerificationCode", (async (e2, t3) => {
        if (t3.captchaResponse === C) {
          _assert(r?.type === q, e2, "argument-error");
          return sendPhoneVerificationCode(e2, await injectRecaptchaV2Token(e2, t3, r));
        }
        return sendPhoneVerificationCode(e2, t3);
      }), "PHONE_PROVIDER");
      return (await i.catch(((e2) => Promise.reject(e2)))).sessionInfo;
    }
  } finally {
    r?._reset();
  }
}
async function injectRecaptchaV2Token(e, t, r) {
  _assert(r.type === q, e, "argument-error");
  const n = await r.verify();
  _assert("string" == typeof n, e, "argument-error");
  const i = { ...t };
  if ("phoneEnrollmentInfo" in i) {
    const e2 = i.phoneEnrollmentInfo.phoneNumber, t2 = i.phoneEnrollmentInfo.captchaResponse, r2 = i.phoneEnrollmentInfo.clientType, s2 = i.phoneEnrollmentInfo.recaptchaVersion;
    return Object.assign(i, { phoneEnrollmentInfo: { phoneNumber: e2, recaptchaToken: n, captchaResponse: t2, clientType: r2, recaptchaVersion: s2 } }), i;
  }
  if ("phoneSignInInfo" in i) {
    const e2 = i.phoneSignInInfo.captchaResponse, t2 = i.phoneSignInInfo.clientType, r2 = i.phoneSignInInfo.recaptchaVersion;
    return Object.assign(i, { phoneSignInInfo: { recaptchaToken: n, captchaResponse: e2, clientType: t2, recaptchaVersion: r2 } }), i;
  }
  return Object.assign(i, { recaptchaToken: n }), i;
}
var PhoneAuthProvider = class _PhoneAuthProvider {
  constructor(e) {
    this.providerId = _PhoneAuthProvider.PROVIDER_ID, this.auth = _castAuth(e);
  }
  verifyPhoneNumber(e, t) {
    return _verifyPhoneNumber(this.auth, e, getModularInstance(t));
  }
  static credential(e, t) {
    return PhoneAuthCredential._fromVerification(e, t);
  }
  static credentialFromResult(e) {
    const t = e;
    return _PhoneAuthProvider.credentialFromTaggedObject(t);
  }
  static credentialFromError(e) {
    return _PhoneAuthProvider.credentialFromTaggedObject(e.customData || {});
  }
  static credentialFromTaggedObject({ _tokenResponse: e }) {
    if (!e) return null;
    const { phoneNumber: t, temporaryProof: r } = e;
    return t && r ? PhoneAuthCredential._fromTokenResponse(t, r) : null;
  }
};
function _withDefaultResolver(e, t) {
  return t ? _getInstance(t) : (_assert(e._popupRedirectResolver, e, "argument-error"), e._popupRedirectResolver);
}
PhoneAuthProvider.PROVIDER_ID = "phone", PhoneAuthProvider.PHONE_SIGN_IN_METHOD = "phone";
var IdpCredential = class extends AuthCredential {
  constructor(e) {
    super("custom", "custom"), this.params = e;
  }
  _getIdTokenResponse(e) {
    return signInWithIdp(e, this._buildIdpRequest());
  }
  _linkToIdToken(e, t) {
    return signInWithIdp(e, this._buildIdpRequest(t));
  }
  _getReauthenticationResolver(e) {
    return signInWithIdp(e, this._buildIdpRequest());
  }
  _buildIdpRequest(e) {
    const t = { requestUri: this.params.requestUri, sessionId: this.params.sessionId, postBody: this.params.postBody, tenantId: this.params.tenantId, pendingToken: this.params.pendingToken, returnSecureToken: true, returnIdpCredential: true };
    return e && (t.idToken = e), t;
  }
};
function _signIn(e) {
  return _signInWithCredential(e.auth, new IdpCredential(e), e.bypassAuthState);
}
function _reauth(e) {
  const { auth: t, user: r } = e;
  return _assert(r, t, "internal-error"), _reauthenticate(r, new IdpCredential(e), e.bypassAuthState);
}
async function _link(e) {
  const { auth: t, user: r } = e;
  return _assert(r, t, "internal-error"), _link$1(r, new IdpCredential(e), e.bypassAuthState);
}
var AbstractPopupRedirectOperation = class {
  constructor(e, t, r, n, i = false) {
    this.auth = e, this.resolver = r, this.user = n, this.bypassAuthState = i, this.pendingPromise = null, this.eventManager = null, this.filter = Array.isArray(t) ? t : [t];
  }
  execute() {
    return new Promise((async (e, t) => {
      this.pendingPromise = { resolve: e, reject: t };
      try {
        if (this.eventManager = await this.resolver._initialize(this.auth), !this.pendingPromise) return;
        if (await this.onExecution(), !this.pendingPromise) return;
        this.eventManager.registerConsumer(this);
      } catch (e2) {
        this.pendingPromise && this.reject(e2);
      }
    }));
  }
  async onAuthEvent(e) {
    if (!this.pendingPromise) return;
    const { urlResponse: t, sessionId: r, postBody: n, tenantId: i, error: s2, type: o2 } = e;
    if (s2) return void this.reject(s2);
    const a2 = { auth: this.auth, requestUri: t, sessionId: r, tenantId: i || void 0, postBody: n || void 0, user: this.user, bypassAuthState: this.bypassAuthState };
    try {
      this.resolve(await this.getIdpTask(o2)(a2));
    } catch (e2) {
      this.reject(e2);
    }
  }
  onError(e) {
    this.reject(e);
  }
  getIdpTask(e) {
    switch (e) {
      case "signInViaPopup":
      case "signInViaRedirect":
        return _signIn;
      case "linkViaPopup":
      case "linkViaRedirect":
        return _link;
      case "reauthViaPopup":
      case "reauthViaRedirect":
        return _reauth;
      default:
        _fail(this.auth, "internal-error");
    }
  }
  resolve(e) {
    debugAssert(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.resolve(e), this.unregisterAndCleanUp();
  }
  reject(e) {
    debugAssert(this.pendingPromise, "Pending promise was never set"), this.pendingPromise.reject(e), this.unregisterAndCleanUp();
  }
  unregisterAndCleanUp() {
    this.eventManager && this.eventManager.unregisterConsumer(this), this.pendingPromise = null, this.cleanUp();
  }
};
var B = new Delay(2e3, 1e4);
async function signInWithPopup(e, t, r) {
  if (_isFirebaseServerApp(e.app)) return Promise.reject(_createError(e, "operation-not-supported-in-this-environment"));
  const i = _castAuth(e);
  _assertInstanceOf(e, t, FederatedAuthProvider);
  const s2 = _withDefaultResolver(i, r);
  return new PopupOperation(i, "signInViaPopup", t, s2).executeNotNull();
}
var PopupOperation = class _PopupOperation extends AbstractPopupRedirectOperation {
  constructor(e, t, r, n, i) {
    super(e, t, n, i), this.provider = r, this.authWindow = null, this.pollId = null, _PopupOperation.currentPopupAction && _PopupOperation.currentPopupAction.cancel(), _PopupOperation.currentPopupAction = this;
  }
  async executeNotNull() {
    const e = await this.execute();
    return _assert(e, this.auth, "internal-error"), e;
  }
  async onExecution() {
    debugAssert(1 === this.filter.length, "Popup operations only handle one event");
    const e = _generateEventId();
    this.authWindow = await this.resolver._openPopup(this.auth, this.provider, this.filter[0], e), this.authWindow.associatedEvent = e, this.resolver._originValidation(this.auth).catch(((e2) => {
      this.reject(e2);
    })), this.resolver._isIframeWebStorageSupported(this.auth, ((e2) => {
      e2 || this.reject(_createError(this.auth, "web-storage-unsupported"));
    })), this.pollUserCancellation();
  }
  get eventId() {
    return this.authWindow?.associatedEvent || null;
  }
  cancel() {
    this.reject(_createError(this.auth, "cancelled-popup-request"));
  }
  cleanUp() {
    this.authWindow && this.authWindow.close(), this.pollId && window.clearTimeout(this.pollId), this.authWindow = null, this.pollId = null, _PopupOperation.currentPopupAction = null;
  }
  pollUserCancellation() {
    const poll = () => {
      this.authWindow?.window?.closed ? this.pollId = window.setTimeout((() => {
        this.pollId = null, this.reject(_createError(this.auth, "popup-closed-by-user"));
      }), 8e3) : this.pollId = window.setTimeout(poll, B.get());
    };
    poll();
  }
};
PopupOperation.currentPopupAction = null;
var z = /* @__PURE__ */ new Map();
var RedirectAction = class extends AbstractPopupRedirectOperation {
  constructor(e, t, r = false) {
    super(e, ["signInViaRedirect", "linkViaRedirect", "reauthViaRedirect", "unknown"], t, void 0, r), this.eventId = null;
  }
  async execute() {
    let e = z.get(this.auth._key());
    if (!e) {
      try {
        const t = await (async function _getAndClearPendingRedirectStatus(e2, t2) {
          const r = pendingRedirectKey(t2), n = resolverPersistence(e2);
          if (!await n._isAvailable()) return false;
          const i = "true" === await n._get(r);
          return await n._remove(r), i;
        })(this.resolver, this.auth) ? await super.execute() : null;
        e = () => Promise.resolve(t);
      } catch (t) {
        e = () => Promise.reject(t);
      }
      z.set(this.auth._key(), e);
    }
    return this.bypassAuthState || z.set(this.auth._key(), (() => Promise.resolve(null))), e();
  }
  async onAuthEvent(e) {
    if ("signInViaRedirect" === e.type) return super.onAuthEvent(e);
    if ("unknown" !== e.type) {
      if (e.eventId) {
        const t = await this.auth._redirectUserForId(e.eventId);
        if (t) return this.user = t, super.onAuthEvent(e);
        this.resolve(null);
      }
    } else this.resolve(null);
  }
  async onExecution() {
  }
  cleanUp() {
  }
};
function _overrideRedirectResult(e, t) {
  z.set(e._key(), t);
}
function resolverPersistence(e) {
  return _getInstance(e._redirectPersistence);
}
function pendingRedirectKey(e) {
  return _persistenceKeyName("pendingRedirect", e.config.apiKey, e.name);
}
async function _getRedirectResult(e, t, r = false) {
  if (_isFirebaseServerApp(e.app)) return Promise.reject(_serverAppCurrentUserOperationNotSupportedError(e));
  const i = _castAuth(e), s2 = _withDefaultResolver(i, t), o2 = new RedirectAction(i, s2, r), a2 = await o2.execute();
  return a2 && !r && (delete a2.user._redirectEventId, await i._persistUserIfCurrent(a2.user), await i._setRedirectUser(null, t)), a2;
}
var AuthEventManager = class {
  constructor(e) {
    this.auth = e, this.cachedEventUids = /* @__PURE__ */ new Set(), this.consumers = /* @__PURE__ */ new Set(), this.queuedRedirectEvent = null, this.hasHandledPotentialRedirect = false, this.lastProcessedEventTime = Date.now();
  }
  registerConsumer(e) {
    this.consumers.add(e), this.queuedRedirectEvent && this.isEventForConsumer(this.queuedRedirectEvent, e) && (this.sendToConsumer(this.queuedRedirectEvent, e), this.saveEventToCache(this.queuedRedirectEvent), this.queuedRedirectEvent = null);
  }
  unregisterConsumer(e) {
    this.consumers.delete(e);
  }
  onEvent(e) {
    if (this.hasEventBeenHandled(e)) return false;
    let t = false;
    return this.consumers.forEach(((r) => {
      this.isEventForConsumer(e, r) && (t = true, this.sendToConsumer(e, r), this.saveEventToCache(e));
    })), this.hasHandledPotentialRedirect || !(function isRedirectEvent(e2) {
      switch (e2.type) {
        case "signInViaRedirect":
        case "linkViaRedirect":
        case "reauthViaRedirect":
          return true;
        case "unknown":
          return isNullRedirectEvent(e2);
        default:
          return false;
      }
    })(e) || (this.hasHandledPotentialRedirect = true, t || (this.queuedRedirectEvent = e, t = true)), t;
  }
  sendToConsumer(e, t) {
    if (e.error && !isNullRedirectEvent(e)) {
      const r = e.error.code?.split("auth/")[1] || "internal-error";
      t.onError(_createError(this.auth, r));
    } else t.onAuthEvent(e);
  }
  isEventForConsumer(e, t) {
    const r = null === t.eventId || !!e.eventId && e.eventId === t.eventId;
    return t.filter.includes(e.type) && r;
  }
  hasEventBeenHandled(e) {
    return Date.now() - this.lastProcessedEventTime >= 6e5 && this.cachedEventUids.clear(), this.cachedEventUids.has(eventUid(e));
  }
  saveEventToCache(e) {
    this.cachedEventUids.add(eventUid(e)), this.lastProcessedEventTime = Date.now();
  }
};
function eventUid(e) {
  return [e.type, e.eventId, e.sessionId, e.tenantId].filter(((e2) => e2)).join("-");
}
function isNullRedirectEvent({ type: e, error: t }) {
  return "unknown" === e && "auth/no-auth-event" === t?.code;
}
var $ = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
var K = /^https?/;
async function _validateOrigin(e) {
  if (e.config.emulator) return;
  const { authorizedDomains: t } = await (async function _getProjectConfig(e2, t2 = {}) {
    return _performApiRequest(e2, "GET", "/v1/projects", t2);
  })(e);
  for (const e2 of t) try {
    if (matchDomain(e2)) return;
  } catch {
  }
  _fail(e, "unauthorized-domain");
}
function matchDomain(e) {
  const t = _getCurrentUrl(), { protocol: r, hostname: n } = new URL(t);
  if (e.startsWith("chrome-extension://")) {
    const i2 = new URL(e);
    return "" === i2.hostname && "" === n ? "chrome-extension:" === r && e.replace("chrome-extension://", "") === t.replace("chrome-extension://", "") : "chrome-extension:" === r && i2.hostname === n;
  }
  if (!K.test(r)) return false;
  if ($.test(e)) return n === e;
  const i = e.replace(/\./g, "\\.");
  return new RegExp("^(.+\\." + i + "|" + i + ")$", "i").test(n);
}
var J = new Delay(3e4, 6e4);
function resetUnloadedGapiModules() {
  const e = _window().___jsl;
  if (e?.H) {
    for (const t of Object.keys(e.H)) if (e.H[t].r = e.H[t].r || [], e.H[t].L = e.H[t].L || [], e.H[t].r = [...e.H[t].L], e.CP) for (let t2 = 0; t2 < e.CP.length; t2++) e.CP[t2] = null;
  }
}
function loadGapi(e) {
  return new Promise(((t, r) => {
    function loadGapiIframe() {
      resetUnloadedGapiModules(), gapi.load("gapi.iframes", { callback: () => {
        t(gapi.iframes.getContext());
      }, ontimeout: () => {
        resetUnloadedGapiModules(), r(_createError(e, "network-request-failed"));
      }, timeout: J.get() });
    }
    if (_window().gapi?.iframes?.Iframe) t(gapi.iframes.getContext());
    else {
      if (!_window().gapi?.load) {
        const t2 = _generateCallbackName("iframefcb");
        return _window()[t2] = () => {
          gapi.load ? loadGapiIframe() : r(_createError(e, "network-request-failed"));
        }, _loadJS(`${(function _gapiScriptUrl() {
          return R.gapiScript;
        })()}?onload=${t2}`).catch(((e2) => r(e2)));
      }
      loadGapiIframe();
    }
  })).catch(((e2) => {
    throw Y = null, e2;
  }));
}
var Y = null;
var X = new Delay(5e3, 15e3);
var Q = { style: { position: "absolute", top: "-100px", width: "1px", height: "1px" }, "aria-hidden": "true", tabindex: "-1" };
var Z = /* @__PURE__ */ new Map([["identitytoolkit.googleapis.com", "p"], ["staging-identitytoolkit.sandbox.googleapis.com", "s"], ["test-identitytoolkit.sandbox.googleapis.com", "t"]]);
function getIframeUrl(e) {
  const t = e.config;
  _assert(t.authDomain, e, "auth-domain-config-required");
  const n = t.emulator ? _emulatorUrl(t, "emulator/auth/iframe") : `https://${e.config.authDomain}/__/auth/iframe`, i = { apiKey: t.apiKey, appName: e.name, v: SDK_VERSION }, s2 = Z.get(e.config.apiHost);
  s2 && (i.eid = s2);
  const o2 = e._getFrameworks();
  return o2.length && (i.fw = o2.join(",")), `${n}?${querystring(i).slice(1)}`;
}
async function _openIframe(e) {
  const t = await (function _loadGapi(e2) {
    return Y = Y || loadGapi(e2), Y;
  })(e), r = _window().gapi;
  return _assert(r, e, "internal-error"), t.open({ where: document.body, url: getIframeUrl(e), messageHandlersFilter: r.iframes.CROSS_ORIGIN_IFRAMES_FILTER, attributes: Q, dontclear: true }, ((t2) => new Promise((async (r2, n) => {
    await t2.restyle({ setHideOnLeave: false });
    const i = _createError(e, "network-request-failed"), s2 = _window().setTimeout((() => {
      n(i);
    }), X.get());
    function clearTimerAndResolve() {
      _window().clearTimeout(s2), r2(t2);
    }
    t2.ping(clearTimerAndResolve).then(clearTimerAndResolve, (() => {
      n(i);
    }));
  }))));
}
var ee = { location: "yes", resizable: "yes", statusbar: "yes", toolbar: "no" };
var AuthPopup = class {
  constructor(e) {
    this.window = e, this.associatedEvent = null;
  }
  close() {
    if (this.window) try {
      this.window.close();
    } catch (e) {
    }
  }
};
function _open(e, t, r, n = 500, i = 600) {
  const s2 = Math.max((window.screen.availHeight - i) / 2, 0).toString(), o2 = Math.max((window.screen.availWidth - n) / 2, 0).toString();
  let a2 = "";
  const c2 = { ...ee, width: n.toString(), height: i.toString(), top: s2, left: o2 }, u2 = getUA().toLowerCase();
  r && (a2 = _isChromeIOS(u2) ? "_blank" : r), _isFirefox(u2) && (t = t || "http://localhost", c2.scrollbars = "yes");
  const d2 = Object.entries(c2).reduce(((e2, [t2, r2]) => `${e2}${t2}=${r2},`), "");
  if ((function _isIOSStandalone(e2 = getUA()) {
    return _isIOS(e2) && !!window.navigator?.standalone;
  })(u2) && "_self" !== a2) return (function openAsNewWindowIOS(e2, t2) {
    const r2 = document.createElement("a");
    r2.href = e2, r2.target = t2;
    const n2 = document.createEvent("MouseEvent");
    n2.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 1, null), r2.dispatchEvent(n2);
  })(t || "", a2), new AuthPopup(null);
  const l2 = window.open(t || "", a2, d2);
  _assert(l2, e, "popup-blocked");
  try {
    l2.focus();
  } catch (e2) {
  }
  return new AuthPopup(l2);
}
var te = "__/auth/handler";
var re = "emulator/auth/handler";
var ne = encodeURIComponent("fac");
async function _getRedirectUrl(e, t, n, i, s2, o2) {
  _assert(e.config.authDomain, e, "auth-domain-config-required"), _assert(e.config.apiKey, e, "invalid-api-key");
  const a2 = { apiKey: e.config.apiKey, appName: e.name, authType: n, redirectUrl: i, v: SDK_VERSION, eventId: s2 };
  if (t instanceof FederatedAuthProvider) {
    t.setDefaultLanguage(e.languageCode), a2.providerId = t.providerId || "", (function isEmpty(e2) {
      for (const t2 in e2) if (Object.prototype.hasOwnProperty.call(e2, t2)) return false;
      return true;
    })(t.getCustomParameters()) || (a2.customParameters = JSON.stringify(t.getCustomParameters()));
    for (const [e2, t2] of Object.entries({})) a2[e2] = t2;
  }
  if (t instanceof BaseOAuthProvider) {
    const e2 = t.getScopes().filter(((e3) => "" !== e3));
    e2.length > 0 && (a2.scopes = e2.join(","));
  }
  e.tenantId && (a2.tid = e.tenantId);
  const c2 = a2;
  for (const e2 of Object.keys(c2)) void 0 === c2[e2] && delete c2[e2];
  const u2 = await e._getAppCheckToken(), d2 = u2 ? `#${ne}=${encodeURIComponent(u2)}` : "";
  return `${(function getHandlerBase({ config: e2 }) {
    if (!e2.emulator) return `https://${e2.authDomain}/${te}`;
    return _emulatorUrl(e2, re);
  })(e)}?${querystring(c2).slice(1)}${d2}`;
}
var ie = "webStorageSupport";
var se = class BrowserPopupRedirectResolver {
  constructor() {
    this.eventManagers = {}, this.iframes = {}, this.originValidationPromises = {}, this._redirectPersistence = U, this._completeRedirectFn = _getRedirectResult, this._overrideRedirectResult = _overrideRedirectResult;
  }
  async _openPopup(e, t, r, n) {
    debugAssert(this.eventManagers[e._key()]?.manager, "_initialize() not called before _openPopup()");
    return _open(e, await _getRedirectUrl(e, t, r, _getCurrentUrl(), n), _generateEventId());
  }
  async _openRedirect(e, t, r, n) {
    await this._originValidation(e);
    return (function _setWindowLocation(e2) {
      _window().location.href = e2;
    })(await _getRedirectUrl(e, t, r, _getCurrentUrl(), n)), new Promise((() => {
    }));
  }
  _initialize(e) {
    const t = e._key();
    if (this.eventManagers[t]) {
      const { manager: e2, promise: r2 } = this.eventManagers[t];
      return e2 ? Promise.resolve(e2) : (debugAssert(r2, "If manager is not set, promise should be"), r2);
    }
    const r = this.initAndGetManager(e);
    return this.eventManagers[t] = { promise: r }, r.catch((() => {
      delete this.eventManagers[t];
    })), r;
  }
  async initAndGetManager(e) {
    const t = await _openIframe(e), r = new AuthEventManager(e);
    return t.register("authEvent", ((t2) => {
      _assert(t2?.authEvent, e, "invalid-auth-event");
      return { status: r.onEvent(t2.authEvent) ? "ACK" : "ERROR" };
    }), gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER), this.eventManagers[e._key()] = { manager: r }, this.iframes[e._key()] = t, r;
  }
  _isIframeWebStorageSupported(e, t) {
    this.iframes[e._key()].send(ie, { type: ie }, ((r) => {
      const n = r?.[0]?.[ie];
      void 0 !== n && t(!!n), _fail(e, "internal-error");
    }), gapi.iframes.CROSS_ORIGIN_IFRAMES_FILTER);
  }
  _originValidation(e) {
    const t = e._key();
    return this.originValidationPromises[t] || (this.originValidationPromises[t] = _validateOrigin(e)), this.originValidationPromises[t];
  }
  get _shouldInitProactively() {
    return _isMobileBrowser() || _isSafari() || _isIOS();
  }
};
var MultiFactorAssertionImpl = class {
  constructor(e) {
    this.factorId = e;
  }
  _process(e, t, r) {
    switch (t.type) {
      case "enroll":
        return this._finalizeEnroll(e, t.credential, r);
      case "signin":
        return this._finalizeSignIn(e, t.credential);
      default:
        return debugFail("unexpected MultiFactorSessionType");
    }
  }
};
var PhoneMultiFactorAssertionImpl = class _PhoneMultiFactorAssertionImpl extends MultiFactorAssertionImpl {
  constructor(e) {
    super("phone"), this.credential = e;
  }
  static _fromCredential(e) {
    return new _PhoneMultiFactorAssertionImpl(e);
  }
  _finalizeEnroll(e, t, r) {
    return (function finalizeEnrollPhoneMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaEnrollment:finalize", _addTidIfNecessary(e2, t2));
    })(e, { idToken: t, displayName: r, phoneVerificationInfo: this.credential._makeVerificationRequest() });
  }
  _finalizeSignIn(e, t) {
    return (function finalizeSignInPhoneMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaSignIn:finalize", _addTidIfNecessary(e2, t2));
    })(e, { mfaPendingCredential: t, phoneVerificationInfo: this.credential._makeVerificationRequest() });
  }
};
var PhoneMultiFactorGenerator = class {
  constructor() {
  }
  static assertion(e) {
    return PhoneMultiFactorAssertionImpl._fromCredential(e);
  }
};
PhoneMultiFactorGenerator.FACTOR_ID = "phone";
var TotpMultiFactorGenerator = class {
  static assertionForEnrollment(e, t) {
    return TotpMultiFactorAssertionImpl._fromSecret(e, t);
  }
  static assertionForSignIn(e, t) {
    return TotpMultiFactorAssertionImpl._fromEnrollmentId(e, t);
  }
  static async generateSecret(e) {
    const t = e;
    _assert(void 0 !== t.user?.auth, "internal-error");
    const r = await (function startEnrollTotpMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaEnrollment:start", _addTidIfNecessary(e2, t2));
    })(t.user.auth, { idToken: t.credential, totpEnrollmentInfo: {} });
    return TotpSecret._fromStartTotpMfaEnrollmentResponse(r, t.user.auth);
  }
};
TotpMultiFactorGenerator.FACTOR_ID = "totp";
var TotpMultiFactorAssertionImpl = class _TotpMultiFactorAssertionImpl extends MultiFactorAssertionImpl {
  constructor(e, t, r) {
    super("totp"), this.otp = e, this.enrollmentId = t, this.secret = r;
  }
  static _fromSecret(e, t) {
    return new _TotpMultiFactorAssertionImpl(t, void 0, e);
  }
  static _fromEnrollmentId(e, t) {
    return new _TotpMultiFactorAssertionImpl(t, e);
  }
  async _finalizeEnroll(e, t, r) {
    return _assert(void 0 !== this.secret, e, "argument-error"), (function finalizeEnrollTotpMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaEnrollment:finalize", _addTidIfNecessary(e2, t2));
    })(e, { idToken: t, displayName: r, totpVerificationInfo: this.secret._makeTotpVerificationInfo(this.otp) });
  }
  async _finalizeSignIn(e, t) {
    _assert(void 0 !== this.enrollmentId && void 0 !== this.otp, e, "argument-error");
    const r = { verificationCode: this.otp };
    return (function finalizeSignInTotpMfa(e2, t2) {
      return _performApiRequest(e2, "POST", "/v2/accounts/mfaSignIn:finalize", _addTidIfNecessary(e2, t2));
    })(e, { mfaPendingCredential: t, mfaEnrollmentId: this.enrollmentId, totpVerificationInfo: r });
  }
};
var TotpSecret = class _TotpSecret {
  constructor(e, t, r, n, i, s2, o2) {
    this.sessionInfo = s2, this.auth = o2, this.secretKey = e, this.hashingAlgorithm = t, this.codeLength = r, this.codeIntervalSeconds = n, this.enrollmentCompletionDeadline = i;
  }
  static _fromStartTotpMfaEnrollmentResponse(e, t) {
    return new _TotpSecret(e.totpSessionInfo.sharedSecretKey, e.totpSessionInfo.hashingAlgorithm, e.totpSessionInfo.verificationCodeLength, e.totpSessionInfo.periodSec, new Date(e.totpSessionInfo.finalizeEnrollmentTime).toUTCString(), e.totpSessionInfo.sessionInfo, t);
  }
  _makeTotpVerificationInfo(e) {
    return { sessionInfo: this.sessionInfo, verificationCode: e };
  }
  generateQrCodeUrl(e, t) {
    let r = false;
    return (_isEmptyString(e) || _isEmptyString(t)) && (r = true), r && (_isEmptyString(e) && (e = this.auth.currentUser?.email || "unknownuser"), _isEmptyString(t) && (t = this.auth.name)), `otpauth://totp/${t}:${e}?secret=${this.secretKey}&issuer=${t}&algorithm=${this.hashingAlgorithm}&digits=${this.codeLength}`;
  }
};
function _isEmptyString(e) {
  return void 0 === e || 0 === e?.length;
}
var oe = "@firebase/auth";
var ae = "1.13.9";
var AuthInterop = class {
  constructor(e) {
    this.auth = e, this.internalListeners = /* @__PURE__ */ new Map();
  }
  getUid() {
    return this.assertAuthConfigured(), this.auth.currentUser?.uid || null;
  }
  async getToken(e) {
    if (this.assertAuthConfigured(), await this.auth._initializationPromise, !this.auth.currentUser) return null;
    return { accessToken: await this.auth.currentUser.getIdToken(e) };
  }
  addAuthTokenListener(e) {
    if (this.assertAuthConfigured(), this.internalListeners.has(e)) return;
    const t = this.auth.onIdTokenChanged(((t2) => {
      e(t2?.stsTokenManager.accessToken || null);
    }));
    this.internalListeners.set(e, t), this.updateProactiveRefresh();
  }
  removeAuthTokenListener(e) {
    this.assertAuthConfigured();
    const t = this.internalListeners.get(e);
    t && (this.internalListeners.delete(e), t(), this.updateProactiveRefresh());
  }
  assertAuthConfigured() {
    _assert(this.auth._initializationPromise, "dependent-sdk-initialized-before-auth");
  }
  updateProactiveRefresh() {
    this.internalListeners.size > 0 ? this.auth._startProactiveRefresh() : this.auth._stopProactiveRefresh();
  }
};
var ce = getExperimentalSetting("authIdTokenMaxAge") || 300;
!(function _setExternalJSProvider(e) {
  R = e;
})({ loadJS: (e) => new Promise(((t, r) => {
  const n = document.createElement("script");
  n.setAttribute("src", e), n.onload = t, n.onerror = (e2) => {
    const t2 = _createError("internal-error");
    t2.customData = e2, r(t2);
  }, n.type = "text/javascript", n.charset = "UTF-8", (function getScriptParentElement() {
    return document.getElementsByTagName("head")?.[0] ?? document;
  })().appendChild(n);
})), gapiScript: "https://apis.google.com/js/api.js", recaptchaV2Script: "https://www.google.com/recaptcha/api.js", recaptchaEnterpriseScript: "https://www.google.com/recaptcha/enterprise.js?render=" }), (function registerAuth(r) {
  _registerComponent(new Component2("auth", ((e, { options: t }) => {
    const n = e.getProvider("app").getImmediate(), i = e.getProvider("heartbeat"), s2 = e.getProvider("app-check-internal"), { apiKey: o2, authDomain: a2 } = n.options;
    _assert(o2 && !o2.includes(":"), "invalid-api-key", { appName: n.name });
    const c2 = { apiKey: o2, authDomain: a2, clientPlatform: r, apiHost: "identitytoolkit.googleapis.com", tokenApiHost: "securetoken.googleapis.com", apiScheme: "https", sdkClientVersion: _getClientVersion(r) }, u2 = new AuthImpl(n, i, s2, c2);
    return (function _initializeAuthInstance(e2, t2) {
      const r2 = t2?.persistence || [], n2 = (Array.isArray(r2) ? r2 : [r2]).map(_getInstance);
      t2?.errorMap && e2._updateErrorMap(t2.errorMap), e2._initializeWithPersistence(n2, t2?.popupRedirectResolver);
    })(u2, t), u2;
  }), "PUBLIC").setInstantiationMode("EXPLICIT").setInstanceCreatedCallback(((e, t, r2) => {
    e.getProvider("auth-internal").initialize();
  }))), _registerComponent(new Component2("auth-internal", ((e) => ((e2) => new AuthInterop(e2))(_castAuth(e.getProvider("auth").getImmediate()))), "PRIVATE").setInstantiationMode("EXPLICIT")), registerVersion(oe, ae, (function getVersionForPlatform(e) {
    switch (e) {
      case "Node":
        return "node";
      case "ReactNative":
        return "rn";
      case "Worker":
        return "webworker";
      case "Cordova":
        return "cordova";
      case "WebExtension":
        return "web-extension";
      default:
        return;
    }
  })(r)), registerVersion(oe, ae, "esm2020");
})("Browser");

// cloudflare-saas/public/firebase-flow.js
async function firebaseFlow(sdk, config, invite, request) {
  let auth2;
  try {
    const app = sdk.getApps().length ? sdk.getApps()[0] : sdk.initializeApp(config);
    auth2 = sdk.getAuthInstance(app);
    const provider = new sdk.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    const challenge = request("/auth/firebase/start", { invite });
    const popup = sdk.signInWithPopup(auth2, provider);
    const [challengeResult, popupResult] = await Promise.allSettled([challenge, popup]);
    if (popupResult.status === "rejected") throw popupResult.reason;
    if (challengeResult.status === "rejected") throw challengeResult.reason;
    const transaction = challengeResult.value, result = popupResult.value;
    const token = await result.user.getIdToken();
    await request("/auth/firebase/complete", { transaction: transaction.transaction, token });
  } catch (e) {
    if (e?.code === "auth/popup-closed-by-user" || e?.code === "auth/cancelled-popup-request") throw Error("\u0412\u0445\u043E\u0434 \u043E\u0442\u043C\u0435\u043D\u0451\u043D. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0435\u0449\u0451 \u0440\u0430\u0437.");
    if (e?.code === "auth/popup-blocked") throw Error("\u0411\u0440\u0430\u0443\u0437\u0435\u0440 \u0437\u0430\u0431\u043B\u043E\u043A\u0438\u0440\u043E\u0432\u0430\u043B \u043E\u043A\u043D\u043E \u0432\u0445\u043E\u0434\u0430. \u0420\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0432\u0441\u043F\u043B\u044B\u0432\u0430\u044E\u0449\u0438\u0435 \u043E\u043A\u043D\u0430 \u0438 \u043F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0441\u043D\u043E\u0432\u0430.");
    throw e;
  } finally {
    if (auth2) await sdk.signOut(auth2).catch(() => {
    });
  }
}

// cloudflare-saas/public/firebase-login.js
var auth;
function firebaseLogin(config, invite, request) {
  const sdk = { initializeApp, getApps, GoogleAuthProvider, signInWithPopup, signOut, getAuthInstance: (app) => auth ?? (auth = initializeAuth(app, { persistence: S, popupRedirectResolver: se })) };
  return firebaseFlow(sdk, config, invite, request);
}

// cloudflare-saas/public/app.js
var loginConfig = null;
var oauthAccount = null;
var session = null;
var attachedSource = null;
var recipeSource = null;
var $2 = (id) => document.getElementById(id);
var el = (tag, cls, txt) => {
  const x = document.createElement(tag);
  if (cls) x.className = cls;
  if (txt !== void 0) x.textContent = txt;
  return x;
};
var uiConfirmation = null;
var screenEpoch = 0;
var csrf = null;
var state = null;
var view = "chat";
var image = null;
var busy = false;
var screenDraft = {};
var questionPage = 0;
var currentPlan = null;
var currentPlanIsDraft = false;
var uiLabels = { theme: "\u041E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435", text_size: "\u0420\u0430\u0437\u043C\u0435\u0440 \u0442\u0435\u043A\u0441\u0442\u0430", density: "\u041A\u0430\u0440\u0442\u043E\u0447\u043A\u0438", simple_mode: "\u041F\u0440\u043E\u0441\u0442\u043E\u0439 \u0440\u0435\u0436\u0438\u043C", home: "\u041D\u0430\u0447\u0430\u043B\u044C\u043D\u044B\u0439 \u0440\u0430\u0437\u0434\u0435\u043B", show_nutrition: "\u041F\u0438\u0449\u0435\u0432\u043E\u0439 \u0441\u043E\u0441\u0442\u0430\u0432", max_active_minutes: "\u041C\u0438\u043D\u0443\u0442 \u043D\u0430 \u0433\u043E\u0442\u043E\u0432\u043A\u0443", meals_per_day: "\u041F\u0440\u0438\u0451\u043C\u043E\u0432 \u043F\u0438\u0449\u0438", max_recipe_repeats_per_week: "\u041F\u043E\u0432\u0442\u043E\u0440\u043E\u0432 \u0431\u043B\u044E\u0434\u0430 \u0432 \u043D\u0435\u0434\u0435\u043B\u044E", show_calories: "\u041F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0442\u044C \u043A\u0430\u043B\u043E\u0440\u0438\u0438", note: "\u0417\u0430\u043F\u0438\u0441\u044C", date: "\u0414\u0430\u0442\u0430", timezone: "\u0427\u0430\u0441\u043E\u0432\u043E\u0439 \u043F\u043E\u044F\u0441", display_name: "\u0418\u043C\u044F", goal: "\u0426\u0435\u043B\u044C", basis_note: "\u041E\u0441\u043D\u043E\u0432\u0430\u043D\u0438\u0435", source_ref: "\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A" };
var values = { normal: "\u043E\u0431\u044B\u0447\u043D\u044B\u0439", large: "\u043A\u0440\u0443\u043F\u043D\u044B\u0439", compact: "\u043A\u043E\u043C\u043F\u0430\u043A\u0442\u043D\u044B\u0435", comfortable: "\u043F\u0440\u043E\u0441\u0442\u043E\u0440\u043D\u044B\u0435", dark: "\u0442\u0451\u043C\u043D\u0430\u044F", light: "\u0441\u0432\u0435\u0442\u043B\u0430\u044F", "ivory-plum": "\u0441\u043B\u0438\u0432\u043E\u0447\u043D\u043E\u0435 \u0441\u043E \u0441\u043B\u0438\u0432\u043E\u0432\u044B\u043C", chat: "\u043E\u0431\u0449\u0435\u043D\u0438\u0435", today: "\u043C\u0435\u043D\u044E", recipes: "\u0440\u0435\u0446\u0435\u043F\u0442\u044B", diary: "\u0434\u043D\u0435\u0432\u043D\u0438\u043A" };
var QUESTIONS = [["adult", "\u0412\u0430\u043C \u0443\u0436\u0435 \u0438\u0441\u043F\u043E\u043B\u043D\u0438\u043B\u043E\u0441\u044C 18 \u043B\u0435\u0442?"], ["pregnant", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u044C?"], ["breastfeeding", "\u041A\u043E\u0440\u043C\u0438\u0442\u0435 \u0433\u0440\u0443\u0434\u044C\u044E?"], ["type1_diabetes", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0434\u0438\u0430\u0431\u0435\u0442 1 \u0442\u0438\u043F\u0430?"], ["sglt2", "\u041F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0435 SGLT2-\u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442 \u2014 \u043D\u0430\u043F\u0440\u0438\u043C\u0435\u0440 \u0424\u043E\u0440\u0441\u0438\u0433\u0443 \u0438\u043B\u0438 \u0414\u0436\u0430\u0440\u0434\u0438\u043D\u0441?"], ["hypoglycemia_medication", "\u041F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u0442\u0435 \u0438\u043D\u0441\u0443\u043B\u0438\u043D \u0438\u043B\u0438 \u0434\u0440\u0443\u0433\u043E\u0439 \u043F\u0440\u0435\u043F\u0430\u0440\u0430\u0442, \u043A\u043E\u0442\u043E\u0440\u044B\u0439 \u043C\u043E\u0436\u0435\u0442 \u0432\u044B\u0437\u0432\u0430\u0442\u044C \u0433\u0438\u043F\u043E\u0433\u043B\u0438\u043A\u0435\u043C\u0438\u044E?"], ["kidney_disease", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0435 \u043F\u043E\u0447\u0435\u043A?"], ["liver_pancreas_gallbladder_disease", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0437\u0430\u0431\u043E\u043B\u0435\u0432\u0430\u043D\u0438\u0435 \u043F\u0435\u0447\u0435\u043D\u0438, \u043F\u043E\u0434\u0436\u0435\u043B\u0443\u0434\u043E\u0447\u043D\u043E\u0439 \u0436\u0435\u043B\u0435\u0437\u044B \u0438\u043B\u0438 \u0436\u0435\u043B\u0447\u043D\u043E\u0433\u043E \u043F\u0443\u0437\u044B\u0440\u044F?"], ["metabolic_contraindication", "\u0418\u0437\u0432\u0435\u0441\u0442\u043D\u044B \u043B\u0438 \u043D\u0430\u0440\u0443\u0448\u0435\u043D\u0438\u044F \u043E\u0431\u043C\u0435\u043D\u0430 \u0436\u0438\u0440\u043E\u0432 \u0438\u043B\u0438 \u0438\u043D\u044B\u0435 \u043F\u0440\u043E\u0442\u0438\u0432\u043E\u043F\u043E\u043A\u0430\u0437\u0430\u043D\u0438\u044F \u043A \u043A\u0435\u0442\u043E\u0433\u0435\u043D\u043D\u043E\u0439 \u0434\u0438\u0435\u0442\u0435?"], ["eating_disorder_risk", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0441\u0435\u0439\u0447\u0430\u0441 \u0438\u043B\u0438 \u0432 \u043F\u0440\u043E\u0448\u043B\u043E\u043C \u0440\u0430\u0441\u0441\u0442\u0440\u043E\u0439\u0441\u0442\u0432\u043E \u043F\u0438\u0449\u0435\u0432\u043E\u0433\u043E \u043F\u043E\u0432\u0435\u0434\u0435\u043D\u0438\u044F?"], ["other_clinical_restrictions", "\u0415\u0441\u0442\u044C \u043B\u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043C\u0435\u0434\u0438\u0446\u0438\u043D\u0441\u043A\u0438\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u043F\u0438\u0442\u0430\u043D\u0438\u044F?"], ["medications_reviewed", "\u0412\u044B \u043F\u0435\u0440\u0435\u0447\u0438\u0441\u043B\u0438\u043B\u0438 \u0432\u0441\u0435 \u043F\u0440\u0438\u043D\u0438\u043C\u0430\u0435\u043C\u044B\u0435 \u043B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430 \u0438\u043B\u0438 \u043F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u043B\u0438, \u0447\u0442\u043E \u0438\u0445 \u043D\u0435\u0442?"], ["allergies_reviewed", "\u0412\u044B \u0443\u043A\u0430\u0437\u0430\u043B\u0438 \u0432\u0441\u0435 \u0438\u0437\u0432\u0435\u0441\u0442\u043D\u044B\u0435 \u043F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438?"]];
var ALLERGENS = [["egg", "\u042F\u0439\u0446\u0430"], ["milk", "\u041C\u043E\u043B\u043E\u043A\u043E"], ["fish", "\u0420\u044B\u0431\u0430"], ["crustacean_shellfish", "\u0420\u0430\u043A\u043E\u043E\u0431\u0440\u0430\u0437\u043D\u044B\u0435"], ["tree_nut", "\u041E\u0440\u0435\u0445\u0438"], ["peanut", "\u0410\u0440\u0430\u0445\u0438\u0441"], ["soy", "\u0421\u043E\u044F"], ["wheat", "\u041F\u0448\u0435\u043D\u0438\u0446\u0430"], ["sesame", "\u041A\u0443\u043D\u0436\u0443\u0442"], ["celery", "\u0421\u0435\u043B\u044C\u0434\u0435\u0440\u0435\u0439"], ["coconut", "\u041A\u043E\u043A\u043E\u0441"]];
var foodStates = { raw: "\u0441\u044B\u0440\u043E\u0439 \u043F\u0440\u043E\u0434\u0443\u043A\u0442", ready_to_eat: "\u0433\u043E\u0442\u043E\u0432\u044B\u0439 \u043A \u0443\u043F\u043E\u0442\u0440\u0435\u0431\u043B\u0435\u043D\u0438\u044E", cooked_roasted: "\u0437\u0430\u043F\u0435\u0447\u0451\u043D\u043D\u044B\u0439", cooked_dry_heat: "\u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u0441\u0443\u0445\u0438\u043C \u0436\u0430\u0440\u043E\u043C", canned_drained: "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439 \u0431\u0435\u0437 \u0436\u0438\u0434\u043A\u043E\u0441\u0442\u0438", ready_to_cook: "\u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439 \u043A \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u044E", cooked_boiled: "\u0432\u0430\u0440\u0451\u043D\u044B\u0439", cooked: "\u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439", dry: "\u0441\u0443\u0445\u043E\u0439", canned: "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439", frozen: "\u0437\u0430\u043C\u043E\u0440\u043E\u0436\u0435\u043D\u043D\u044B\u0439" };
var numberRu = (n) => n == null ? "\u043D\u0435\u0442 \u0434\u0430\u043D\u043D\u044B\u0445" : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(n);
var foodState = (x) => foodStates[x] || "\u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435: \u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0432 \u043A\u0430\u0440\u0442\u043E\u0447\u043A\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430";
function readable(message) {
  return String(message).replace(/(?:Сначала скрининг|План не разрешён):[^\n]*/g, "\u0414\u043B\u044F \u043C\u0435\u043D\u044E \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u0442\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0432 \u0440\u0430\u0437\u0434\u0435\u043B\u0435 \xAB\u0417\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E \u0438 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F\xBB \u0438 \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u043D\u044B\u0435 \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F.");
}
function notify(message) {
  if ($2("workspace").hidden) {
    $2("cf-login-message").textContent = readable(message);
    return;
  }
  $2("toast").textContent = readable(message);
  $2("toast").hidden = false;
  clearTimeout(notify.t);
  notify.t = setTimeout(() => $2("toast").hidden = true, 7e3);
}
function human(x) {
  if (typeof x === "string" && x.startsWith('{"source_id"')) {
    try {
      const s2 = JSON.parse(x);
      return [s2.title, s2.author, s2.url].filter(Boolean).join(" \xB7 ");
    } catch {
    }
  }
  return typeof x === "boolean" ? x ? "\u0432\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : "\u0432\u044B\u043A\u043B\u044E\u0447\u0435\u043D\u043E" : values[x] ?? String(x ?? "\u043D\u0435 \u0443\u043A\u0430\u0437\u0430\u043D\u043E");
}
async function run(fn) {
  try {
    return await fn();
  } catch (e) {
    notify(e.message || "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435.");
    return null;
  }
}
async function call(name2, args = {}) {
  const epoch = screenEpoch;
  const r = await fetch("/api/tools/" + encodeURIComponent(name2), { method: "POST", headers: { "Content-Type": "application/json", "x-csrf-token": csrf ?? "" }, body: JSON.stringify(args) });
  const d2 = await r.json();
  if (epoch !== screenEpoch) throw Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D.");
  if (!r.ok) {
    if (r.status === 401) showLogin();
    throw Error({ BRIDGE_NOT_CONFIGURED: "\u0421\u0435\u0440\u0432\u0438\u0441 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D.", COMPUTE_UNAVAILABLE: "\u0421\u0435\u0440\u0432\u0438\u0441 \u0432\u0440\u0435\u043C\u0435\u043D\u043D\u043E \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u0435\u043D. \u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u043F\u043E\u0432\u0442\u043E\u0440\u0451\u043D.", REQUEST_PENDING: "\u0417\u0430\u043F\u0440\u043E\u0441 \u0443\u0436\u0435 \u043E\u0431\u0440\u0430\u0431\u0430\u0442\u044B\u0432\u0430\u0435\u0442\u0441\u044F.", REQUEST_FAILED: "\u0417\u0430\u043F\u0440\u043E\u0441 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0438\u043B\u0441\u044F; \u043D\u0430\u0447\u043D\u0438\u0442\u0435 \u043D\u043E\u0432\u044B\u0439.", STATE_CHANGED: "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u043B\u0438 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D.", BUSY_OR_CONSENT_OR_LIMIT: "\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0440\u0430\u0437\u0440\u0435\u0448\u0435\u043D\u0438\u044F \u0438\u043B\u0438 \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u043E\u0437\u0436\u0435.", VALIDATION_FAILED: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0432\u044B\u043F\u043E\u043B\u043D\u0438\u0442\u044C \u0434\u0435\u0439\u0441\u0442\u0432\u0438\u0435: \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043E\u0442\u0432\u0435\u0442\u044B, \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F \u0438 \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B." }[d2.error] || d2.detail || "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E. \u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0434\u0430\u043D\u043D\u044B\u0435.");
  }
  return d2;
}
function clearScreen() {
  screenEpoch++;
  oauthAccount = null;
  attachedSource = null;
  recipeSource = null;
  if ($2("source-recipe-dialog").open) $2("source-recipe-dialog").close();
  uiConfirmation = null;
  currentPlan = null;
  currentPlanIsDraft = false;
  image = null;
  screenDraft = {};
  questionPage = 0;
  document.querySelectorAll("form").forEach((form) => form.reset());
  $2("toast").hidden = true;
  for (const id of ["recipe-detail", "recipes", "history", "allergy-options", "screen-questions", "source-list", "admin-summary", "invite-link"]) $2(id).replaceChildren();
  for (const id of ["display-name", "goal", "timezone", "medications", "diary-note", "recipe-query", "photo"]) $2(id).value = "";
  if ($2("recipe-dialog").open) $2("recipe-dialog").close();
  $2("messages").replaceChildren();
  $2("menu-result").replaceChildren();
  $2("chat-extras").replaceChildren();
  $2("diary-entries").replaceChildren();
  $2("proposals").replaceChildren();
  $2("photo-status").textContent = "";
  $2("message").value = "";
}
function showLogin() {
  clearScreen();
  $2("login").hidden = false;
  $2("workspace").hidden = true;
  $2("connection").textContent = "\u041B\u0438\u0447\u043D\u043E\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435";
}
function formatDate(d2) {
  try {
    return new Intl.DateTimeFormat("ru", { day: "numeric", month: "long" }).format(/* @__PURE__ */ new Date(d2 + "T12:00:00"));
  } catch {
    return d2;
  }
}
function localDate() {
  const d2 = /* @__PURE__ */ new Date();
  return [d2.getFullYear(), String(d2.getMonth() + 1).padStart(2, "0"), String(d2.getDate()).padStart(2, "0")].join("-");
}
function setView(next) {
  view = next;
  document.querySelectorAll("[data-page]").forEach((p) => p.hidden = p.dataset.page !== next);
  document.querySelectorAll("[data-view]").forEach((b2) => {
    b2.classList.toggle("active", b2.dataset.view === next);
    b2.setAttribute("aria-current", b2.dataset.view === next ? "page" : "false");
  });
  if (next === "recipes") run(loadRecipes);
  if (next === "onboarding") fillOnboard();
  if (next === "settings") fillSettings();
  if (next === "sources") run(sources);
  if (next === "admin") run(admin);
}
function setState(next) {
  if (state && state.profile.owner_account_id !== next.profile.owner_account_id) clearScreen();
  if (!next.processing_consent || !next.profile.consent.storage || !next.profile.consent.health_data) clearScreen();
  state = next;
  renderState();
}
function accept(d2) {
  if (d2?.state) {
    setState(d2.state);
  }
  if (d2?.shopping) renderShopping(d2.shopping);
  if (d2?.message) notify(d2.message);
  return d2;
}
function renderState() {
  $2("login").hidden = true;
  $2("workspace").hidden = false;
  $2("version").textContent = state.version;
  $2("demo-banner").hidden = state.subject_kind !== "demo";
  $2("connection").textContent = "\u041B\u0438\u0447\u043D\u043E\u0435 \u043F\u0440\u043E\u0441\u0442\u0440\u0430\u043D\u0441\u0442\u0432\u043E";
  const u2 = state.ui;
  document.body.className = [u2.theme === "dark" ? "dark" : u2.theme === "light" ? "light" : "", u2.text_size === "large" ? "large" : "", u2.density === "compact" ? "compact" : "", u2.simple_mode ? "simple" : "", !u2.show_nutrition ? "no-nutrition" : ""].filter(Boolean).join(" ");
  $2("consent-panel").hidden = state.processing_consent && state.profile.consent.storage && state.profile.consent.health_data;
  $2("holds").hidden = !state.holds.length;
  $2("holds").textContent = "\u041F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0435 \u043F\u043B\u0430\u043D\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E. \u0415\u0441\u0442\u044C \u043E\u0431\u0441\u0442\u043E\u044F\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u0430, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u043D\u0443\u0436\u043D\u043E \u043E\u0431\u0441\u0443\u0434\u0438\u0442\u044C \u0441 \u043B\u0435\u0447\u0430\u0449\u0438\u043C \u0441\u043F\u0435\u0446\u0438\u0430\u043B\u0438\u0441\u0442\u043E\u043C. \u0414\u043D\u0435\u0432\u043D\u0438\u043A \u0438 \u043E\u0431\u0449\u0438\u0435 \u0444\u0443\u043D\u043A\u0446\u0438\u0438 \u043E\u0441\u0442\u0430\u044E\u0442\u0441\u044F \u0434\u043E\u0441\u0442\u0443\u043F\u043D\u044B.";
  $2("state-summary").textContent = "\u0421\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F " + state.revision + " \xB7 " + state.catalog.recipes + " \u0440\u0435\u0446\u0435\u043F\u0442\u0443\u0440\u044B";
  renderProposals();
  renderDiary();
  renderHistory();
  if (state.chat.length) {
    $2("messages").replaceChildren(...state.chat.map((x) => el("div", "bubble " + x.role, x.text)));
    $2("messages").scrollTop = $2("messages").scrollHeight;
  } else {
    $2("messages").replaceChildren(el("div", "bubble assistant", "\u041D\u0430\u0447\u043D\u0451\u043C \u0441 \u0442\u043E\u0433\u043E, \u0447\u0442\u043E \u0432\u0430\u043C \u0441\u0435\u0439\u0447\u0430\u0441 \u043D\u0443\u0436\u043D\u043E: \u0438\u0434\u0435\u044F \u0431\u043B\u044E\u0434\u0430, \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u0438\u043B\u0438 \u0437\u043D\u0430\u043A\u043E\u043C\u0441\u0442\u0432\u043E?"));
  }
  const ready = state.screening.can_plan && !state.holds.length && state.profile.targets;
  $2("menu-gate").textContent = ready ? "\u041E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B \u0441\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u044B. \u0421\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0439 \u043F\u043B\u0430\u043D \u0431\u0443\u0434\u0435\u0442 \u043F\u0440\u043E\u0432\u0435\u0440\u0435\u043D \u043F\u043E \u043D\u0438\u043C." : "\u0414\u043B\u044F \u043F\u0435\u0440\u0441\u043E\u043D\u0430\u043B\u044C\u043D\u043E\u0433\u043E \u043C\u0435\u043D\u044E \u043D\u0443\u0436\u043D\u044B \u0437\u0430\u0432\u0435\u0440\u0448\u0451\u043D\u043D\u044B\u0435 \u0432\u043E\u043F\u0440\u043E\u0441\u044B \u0438 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E \u0441\u043E\u0433\u043B\u0430\u0441\u043E\u0432\u0430\u043D\u043D\u044B\u0435 \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B. \u041C\u043E\u0436\u043D\u043E \u043F\u043E\u043A\u0430 \u0432\u044B\u0431\u0438\u0440\u0430\u0442\u044C \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u044B\u0435 \u0440\u0435\u0446\u0435\u043F\u0442\u044B.";
  if (state.plans.length) {
    currentPlan = state.plans.at(-1);
    renderPlan(currentPlan, false);
  } else if (currentPlan && (!currentPlanIsDraft || currentPlan.profile_revision !== state.profile.profile_revision)) {
    currentPlan = null;
    $2("menu-result").replaceChildren(el("div", "notice", "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F \u2014 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043D\u0443\u0436\u043D\u043E \u043F\u0435\u0440\u0435\u0441\u0447\u0438\u0442\u0430\u0442\u044C."));
  }
  if (state.holds.length) {
    currentPlan = null;
    $2("menu-result").replaceChildren(el("div", "notice danger", "\u0420\u0430\u043D\u0435\u0435 \u043F\u043E\u043A\u0430\u0437\u0430\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E \u043D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0435\u0442\u0441\u044F: \u0442\u0440\u0435\u0431\u0443\u0435\u0442\u0441\u044F \u0440\u0430\u0437\u0431\u043E\u0440 \u043D\u043E\u0432\u043E\u0433\u043E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F."));
  }
}
function flatten(payload, prefix = "") {
  let out = [];
  for (const [key, val] of Object.entries(payload)) {
    if (val && typeof val === "object" && !Array.isArray(val)) out.push(...flatten(val, prefix + key + "."));
    else out.push([prefix + key, val]);
  }
  return out;
}
function renderProposals() {
  $2("proposals").replaceChildren();
  for (const p of state.pending) {
    const card = el("div", "proposal");
    card.append(el("span", "eyebrow", "\u041D\u0410 \u041F\u0420\u041E\u0412\u0415\u0420\u041A\u0423"), el("h3", "", { "ui": "\u0418\u0437\u043C\u0435\u043D\u0438\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435", "configuration": "\u041F\u043E\u0434\u0441\u0442\u0440\u043E\u0438\u0442\u044C \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u0438 \u0440\u0435\u0436\u0438\u043C", "profile.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0442\u0432\u0435\u0442\u044B", "diary.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C", "diary.delete": "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C", "plan.accept": "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E \u043C\u0435\u043D\u044E", "catalog.recipe.add": "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u043B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0446\u0435\u043F\u0442", "targets.update": "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C \u043E\u0440\u0438\u0435\u043D\u0442\u0438\u0440\u044B", "feature.request": "\u041F\u043E\u0436\u0435\u043B\u0430\u043D\u0438\u0435 \u0440\u0430\u0437\u0440\u0430\u0431\u043E\u0442\u0447\u0438\u043A\u0443", "ui.rollback": "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u043F\u0440\u0435\u0436\u043D\u0438\u0439 \u0432\u0438\u0434" }[p.type] || "\u041F\u043E\u0434\u0442\u0432\u0435\u0440\u0434\u0438\u0442\u044C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0435"));
    const dl = el("dl");
    const pairs = p.type === "plan.accept" ? [["\u0414\u043D\u0435\u0439", p.payload.days?.length], ["\u0421\u0442\u0430\u0442\u0443\u0441", "\u041F\u0440\u043E\u0432\u0435\u0440\u0435\u043D\u043D\u044B\u0439 \u0440\u0430\u0441\u0447\u0451\u0442\u043D\u044B\u0439 \u0447\u0435\u0440\u043D\u043E\u0432\u0438\u043A"]] : flatten(p.payload);
    for (const [key, val] of pairs.slice(0, 22)) {
      const leaf = key.split(".").at(-1);
      const label = uiLabels[leaf] || QUESTIONS.find((x) => x[0] === leaf)?.[1] || { allergies: "\u041F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438", medications: "\u041B\u0435\u043A\u0430\u0440\u0441\u0442\u0432\u0430", screening: "\u0412\u043E\u043F\u0440\u043E\u0441\u044B \u0430\u043D\u043A\u0435\u0442\u044B" }[leaf] || leaf;
      dl.append(el("dt", "", label), el("dd", "", Array.isArray(val) ? val.map((x) => typeof x === "object" ? x.name || x.recipe_id || (x.food_id ? x.food_id + " \xB7 " + numberRu(x.grams_edible) + " \u0433 \xB7 " + foodState(x.state) : "\u0437\u0430\u043F\u0438\u0441\u044C") : ALLERGENS.find((a2) => a2[0] === x)?.[1] || human(x)).join(", ") : human(val)));
    }
    card.append(dl);
    if (p.type === "plan.accept") {
      const details = el("details"), summary = el("summary", "", "\u041F\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u0442\u044C \u0431\u043B\u044E\u0434\u0430 \u0438 \u0433\u0440\u0430\u043C\u043C\u043E\u0432\u043A\u0438 \u043F\u0435\u0440\u0435\u0434 \u0432\u044B\u0431\u043E\u0440\u043E\u043C");
      details.append(summary);
      for (const day of p.payload.days) {
        details.append(el("h3", "", formatDate(day.date)));
        for (const meal of day.meals) {
          details.append(el("p", "", meal.name_ru));
          const ul = el("ul");
          for (const i of meal.ingredients) ul.append(el("li", "", i.name_ru + " \u2014 " + numberRu(i.grams_edible) + " \u0433 \xB7 " + foodState(i.state)));
          details.append(ul);
        }
      }
      card.append(details);
    }
    const ok = el("button", "primary", "\u041F\u0440\u0438\u043C\u0435\u043D\u0438\u0442\u044C"), no = el("button", "secondary", "\u041E\u0442\u043C\u0435\u043D\u0430");
    ok.addEventListener("click", () => run(async () => {
      ok.disabled = true;
      try {
        accept(await call("keto_apply_proposal", { proposal_id: p.id, expected_revision: state.revision, approved: true }));
      } finally {
        ok.disabled = false;
      }
    }));
    no.addEventListener("click", () => run(async () => accept(await call("keto_apply_proposal", { proposal_id: p.id, expected_revision: state.revision, approved: false }))));
    card.append(ok, no);
    if (p.expired || p.base_revision !== state.revision) {
      ok.disabled = true;
      card.append(el("p", "muted", p.expired ? "\u0421\u0440\u043E\u043A \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u044F \u0438\u0441\u0442\u0451\u043A. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u0435\u0433\u043E \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E." : "\u0414\u0430\u043D\u043D\u044B\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C. \u041E\u0442\u043C\u0435\u043D\u0438\u0442\u0435 \u043F\u0440\u0435\u0434\u043B\u043E\u0436\u0435\u043D\u0438\u0435 \u0438 \u043F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u044C\u0442\u0435 \u0437\u0430\u043D\u043E\u0432\u043E."));
    }
    $2("proposals").append(card);
  }
}
async function propose(type, payload) {
  const anchor = document.activeElement?.closest("form") || document.querySelector(`[data-page="${view}"] .page-heading`);
  const r = await call("keto_propose_change", { event_type: type, payload, expected_revision: state.revision });
  accept(r);
  if (anchor) anchor.insertAdjacentElement("afterend", $2("proposals"));
  $2("proposals").scrollIntoView({ behavior: "smooth", block: "start" });
  return r;
}
function recipeCard(r) {
  const b2 = el("button", "recipe-card");
  b2.append(el("span", "tag", r.category === "breakfast" ? "\u041A \u0437\u0430\u0432\u0442\u0440\u0430\u043A\u0443" : "\u041D\u0430 \u0432\u0430\u0448\u0435\u0439 \u043A\u0443\u0445\u043D\u0435"), el("h3", "", r.name_ru));
  const meta = el("div", "recipe-meta");
  meta.append(el("span", "", r.active_minutes + " \u043C\u0438\u043D"), el("span", "nutrition", Math.round(r.nutrition.energy_kcal) + " \u043A\u043A\u0430\u043B \xB7 \u0440\u0430\u0441\u0447\u0451\u0442"));
  b2.append(meta, el("span", "open", "\u0418\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u044B \u0438 \u0448\u0430\u0433\u0438 \u2192"));
  b2.addEventListener("click", () => openRecipe(r));
  return b2;
}
function openRecipe(r) {
  const box = $2("recipe-detail");
  box.replaceChildren(el("span", "eyebrow", "\u0420\u0415\u0426\u0415\u041F\u0422 \xB7 " + r.active_minutes + " \u041C\u0418\u041D"), el("h2", "", r.name_ru));
  const list = el("ul", "ingredient-list");
  for (const i of r.ingredients) {
    const li = el("li");
    li.append(el("span", "", i.name_ru + " \xB7 " + foodState(i.state) + (i.food_id ? " \xB7 \u043A\u043E\u0434 " + i.food_id : "")), el("strong", "", numberRu(i.grams_edible) + " \u0433"));
    list.append(li);
  }
  box.append(list);
  const steps = el("ol", "steps");
  const source = Array.isArray(r.steps_ru) ? r.steps_ru : [r.steps_ru];
  for (const st of source) steps.append(el("li", "", st));
  box.append(steps, el("p", "nutrition muted", `\u0420\u0430\u0441\u0447\u0451\u0442 \u043D\u0430 \u043F\u043E\u0440\u0446\u0438\u044E: ${Math.round(r.nutrition.energy_kcal)} \u043A\u043A\u0430\u043B; \u0431\u0435\u043B\u043E\u043A ${numberRu(r.nutrition.protein_g)} \u0433; \u043E\u0431\u0449\u0438\u0435 \u0443\u0433\u043B\u0435\u0432\u043E\u0434\u044B ${numberRu(r.nutrition.carbohydrate_total_g)} \u0433. \u041E\u0442\u0441\u0443\u0442\u0441\u0442\u0432\u0443\u044E\u0449\u0438\u0435 \u043D\u0443\u0442\u0440\u0438\u0435\u043D\u0442\u044B \u043D\u0435 \u0441\u0447\u0438\u0442\u0430\u044E\u0442\u0441\u044F \u043D\u0443\u043B\u0451\u043C.`), el("p", "muted", "\u0410\u043B\u043B\u0435\u0440\u0433\u0435\u043D\u044B: " + (r.allergens.map((x) => ALLERGENS.find((a2) => a2[0] === x)?.[1] || "\u0443\u0442\u043E\u0447\u043D\u0438\u0442\u0435 \u0441\u043E\u0441\u0442\u0430\u0432").join(", ") || "\u043D\u0435 \u043E\u0442\u043C\u0435\u0447\u0435\u043D\u044B \u0432 \u0441\u043F\u0440\u0430\u0432\u043E\u0447\u043D\u0438\u043A\u0435; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u044D\u0442\u0438\u043A\u0435\u0442\u043A\u0438") + ". \u0420\u0435\u0446\u0435\u043F\u0442\u0443\u0440\u0430 \u043D\u0435 \u043F\u0440\u043E\u0448\u043B\u0430 \u043A\u0443\u0445\u043E\u043D\u043D\u043E\u0435 \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435."));
  const fav = el("button", "secondary", "\u041F\u043E\u043D\u0440\u0430\u0432\u0438\u043B\u043E\u0441\u044C");
  fav.addEventListener("click", () => run(async () => {
    $2("recipe-dialog").close();
    await propose("feedback.add", { recipe_id: r.recipe_id, rating: 5, would_repeat: true });
  }));
  box.append(fav);
  $2("recipe-dialog").showModal();
}
async function loadRecipes() {
  const d2 = await call("keto_recipes", { query: $2("recipe-query").value, limit: 24 });
  $2("recipe-note").textContent = d2.note;
  $2("recipes").replaceChildren(...d2.recipes.map(recipeCard));
  if (!d2.recipes.length) $2("recipes").append(el("div", "panel", "\u041D\u0435 \u043D\u0430\u0448\u043B\u043E\u0441\u044C \u0441\u043E\u0432\u043F\u0430\u0434\u0435\u043D\u0438\u044F. \u041F\u043E\u043F\u0440\u043E\u0431\u0443\u0439\u0442\u0435 \u0434\u0440\u0443\u0433\u043E\u0435 \u043D\u0430\u0437\u0432\u0430\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u0430."));
}
function renderDiary() {
  $2("diary-entries").replaceChildren();
  if (!state.diary.length) $2("diary-entries").append(el("div", "panel muted", "\u041F\u043E\u043A\u0430 \u043D\u0435\u0442 \u0437\u0430\u043F\u0438\u0441\u0435\u0439. \u0414\u043E\u0431\u0430\u0432\u044C\u0442\u0435 \u043F\u0435\u0440\u0432\u0443\u044E \u0437\u0430\u043C\u0435\u0442\u043A\u0443 \u2014 \u0431\u0435\u0437 \u043E\u0431\u044F\u0437\u0430\u0442\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0432\u0435\u0441\u0430 \u0438 \u043A\u0430\u043B\u043E\u0440\u0438\u0439."));
  for (const e of [...state.diary].reverse()) {
    const card = el("article", "diary-entry");
    card.append(el("time", "", formatDate(e.date)), el("p", "", e.note || "\u0417\u0430\u043F\u0438\u0441\u044C \u043E \u043F\u0438\u0442\u0430\u043D\u0438\u0438"));
    const del = el("button", "text-btn", "\u0423\u0434\u0430\u043B\u0438\u0442\u044C \u0437\u0430\u043F\u0438\u0441\u044C");
    del.addEventListener("click", () => run(() => propose("diary.delete", { entry_id: e.entry_id })));
    card.append(del);
    $2("diary-entries").append(card);
  }
}
function renderHistory() {
  $2("history").replaceChildren();
  if (!state.ui_history.length) $2("history").append(el("p", "muted", "\u041F\u043E\u043A\u0430 \u043E\u0444\u043E\u0440\u043C\u043B\u0435\u043D\u0438\u0435 \u043D\u0435 \u043C\u0435\u043D\u044F\u043B\u043E\u0441\u044C."));
  for (const x of [...state.ui_history].reverse()) {
    const b2 = el("button", "secondary", "\u0412\u0435\u0440\u043D\u0443\u0442\u044C \u0432\u0438\u0434 \u0434\u043E " + new Date(x.at).toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" }));
    b2.addEventListener("click", () => run(() => propose("ui.rollback", { history_id: x.id })));
    $2("history").append(b2);
  }
}
function fillSettings() {
  if (!state) return;
  for (const [key, value] of Object.entries(state.ui)) {
    const input = $2(key);
    if (input) input.type === "checkbox" ? input.checked = value : input.value = value;
  }
  for (const key of ["meals_per_day", "max_active_minutes"]) $2(key).value = state.profile.settings[key];
}
function renderPlan(plan, draft = true) {
  currentPlan = plan;
  currentPlanIsDraft = draft;
  const root = $2("menu-result");
  root.replaceChildren(el("h2", "", draft ? "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A \u043C\u0435\u043D\u044E" : "\u0412\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435 \u043C\u0435\u043D\u044E"));
  if (plan.status === "stale_requires_recheck") root.append(el("div", "notice danger", "\u041F\u0440\u043E\u0444\u0438\u043B\u044C \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F: \u044D\u0442\u043E \u043C\u0435\u043D\u044E \u0442\u0440\u0435\u0431\u0443\u0435\u0442 \u043F\u0435\u0440\u0435\u0441\u0447\u0451\u0442\u0430. \u041D\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u0439\u0442\u0435 \u043A\u0430\u043A \u0430\u043A\u0442\u0443\u0430\u043B\u044C\u043D\u043E\u0435."));
  for (const d2 of plan.days) {
    const box = el("article", "menu-day");
    box.append(el("h3", "", formatDate(d2.date)));
    for (const m of d2.meals) {
      const part = el("div", "meal");
      part.append(el("h3", "", m.name_ru));
      const b2 = el("button", "text-btn", "\u0413\u0440\u0430\u043C\u043C\u043E\u0432\u043A\u0438 \u0438 \u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u0438\u0435");
      b2.addEventListener("click", () => openRecipe(m));
      part.append(b2);
      box.append(part);
    }
    root.append(box);
  }
  if (draft) {
    const b2 = el("button", "primary", "\u0412\u044B\u0431\u0440\u0430\u0442\u044C \u044D\u0442\u043E \u043C\u0435\u043D\u044E");
    b2.addEventListener("click", () => run(() => propose("plan.accept", plan)));
    root.append(b2);
  }
}
function renderShopping(items) {
  const root = $2("menu-result"), box = el("div", "panel");
  box.append(el("h2", "", "\u0421\u043F\u0438\u0441\u043E\u043A \u043F\u043E\u043A\u0443\u043F\u043E\u043A"), el("p", "muted", "\u0423\u043A\u0430\u0437\u0430\u043D\u0430 \u043C\u0430\u0441\u0441\u0430 \u0441\u044A\u0435\u0434\u043E\u0431\u043D\u043E\u0439 \u0447\u0430\u0441\u0442\u0438; \u043F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432."));
  const list = el("ul");
  for (const i of items) list.append(el("li", "", i.name_ru + " \u2014 " + numberRu(i.grams_edible) + " \u0433 \xB7 " + foodState(i.state)));
  box.append(list);
  root.append(box);
}
function fillOnboard() {
  if (!state) return;
  const p = state.profile;
  screenDraft = { ...p.screening };
  $2("display-name").value = p.display_name || "";
  $2("goal").value = p.goal || "";
  $2("timezone").value = p.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || "";
  $2("medications").value = p.medications.map((x) => x.name).join(", ");
  $2("allergy-options").replaceChildren();
  for (const [id, name2] of ALLERGENS) {
    const label = el("label", "check"), i = document.createElement("input");
    i.type = "checkbox";
    i.value = id;
    i.checked = p.allergies.includes(id);
    label.append(i, el("span", "", name2));
    $2("allergy-options").append(label);
  }
  renderQuestions();
}
function renderQuestions() {
  const start2 = questionPage * 2;
  $2("question-progress").textContent = `\u0412\u043E\u043F\u0440\u043E\u0441\u044B ${start2 + 1}\u2013${Math.min(start2 + 2, QUESTIONS.length)} \u0438\u0437 ${QUESTIONS.length}`;
  $2("screen-questions").replaceChildren();
  for (const [key, label] of QUESTIONS.slice(start2, start2 + 2)) {
    const lab = el("label", "", label), sel = el("select");
    sel.dataset.screen = key;
    sel.setAttribute("aria-label", label);
    for (const [v2, t] of [["unknown", "\u041D\u0435 \u0437\u043D\u0430\u044E / \u0435\u0449\u0451 \u043D\u0435 \u043E\u0442\u0432\u0435\u0442\u0438\u043B\u0430"], ["yes", "\u0414\u0430"], ["no", "\u041D\u0435\u0442"]]) {
      const o2 = el("option", "", t);
      o2.value = v2;
      sel.append(o2);
    }
    sel.value = screenDraft[key] === true ? "yes" : screenDraft[key] === false ? "no" : "unknown";
    sel.addEventListener("change", () => screenDraft[key] = sel.value === "unknown" ? null : sel.value === "yes");
    lab.append(sel);
    $2("screen-questions").append(lab);
  }
  $2("question-prev").disabled = questionPage === 0;
  $2("question-next").disabled = start2 + 2 >= QUESTIONS.length;
}
function markSafetyHold(d2) {
  if (!d2?.safety_hold) return;
  if (state) state.holds = [.../* @__PURE__ */ new Set([...state.holds || [], ...d2.safety_hold])];
  currentPlan = null;
  $2("menu-result").replaceChildren(el("div", "notice danger", "\u041C\u0435\u043D\u044E \u043F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u043B\u0435\u043D\u043E \u0438\u0437-\u0437\u0430 \u043D\u043E\u0432\u043E\u0433\u043E \u043E\u0433\u0440\u0430\u043D\u0438\u0447\u0435\u043D\u0438\u044F."));
}
async function send(message) {
  if (busy) {
    if (!/(не могу дышать|задыхаюсь|теряю сознание|сильная боль в груди|непрекращающаяся рвота)/i.test(message)) return;
    try {
      const d2 = await call("keto_chat", { message, request_id: crypto.randomUUID().replaceAll("-", "") });
      $2("messages").append(el("div", "bubble assistant", d2.message));
      markSafetyHold(d2);
    } catch (e) {
      notify(e.message);
    }
    return;
  }
  busy = true;
  $2("send").disabled = true;
  const user = el("div", "bubble user", message), wait = el("div", "bubble pending", "\u0420\u0430\u0437\u0431\u0438\u0440\u0430\u044E\u0441\u044C\u2026");
  $2("messages").append(user, wait);
  $2("messages").scrollTop = $2("messages").scrollHeight;
  try {
    const args = { message, request_id: crypto.randomUUID().replaceAll("-", "") };
    if (image) args.image_data_url = image;
    if (attachedSource) args.source_id = attachedSource;
    const d2 = await call("keto_chat", args);
    attachedSource = null;
    wait.remove();
    if (d2.state) accept(d2);
    if (!d2.state?.chat?.length || d2.error_code || d2.requires_consent) $2("messages").append(el("div", "bubble assistant", d2.message));
    markSafetyHold(d2);
    $2("message").value = "";
    image = null;
    $2("photo").value = "";
    $2("photo-status").textContent = "";
    if (d2.recipes) {
      const cards = el("div", "recipe-grid");
      cards.append(...d2.recipes.map(recipeCard));
      $2("chat-extras").replaceChildren(el("h2", "", "\u0418\u0434\u0435\u0438 \u0434\u043B\u044F \u0432\u0430\u0441"), cards);
    }
    if (d2.plan) {
      renderPlan(d2.plan);
      if (d2.shopping) renderShopping(d2.shopping);
      setView("today");
    }
    if (d2.proposal) {
      $2("chat-form").insertAdjacentElement("afterend", $2("proposals"));
      $2("proposals").scrollIntoView({ behavior: "smooth" });
    }
  } catch (e) {
    wait.textContent = "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043D\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u043E. " + e.message;
    notify(e.message);
  } finally {
    busy = false;
    $2("send").disabled = false;
  }
}
function download(data) {
  const b2 = new Blob([data.text], { type: data.mime }), u2 = URL.createObjectURL(b2), a2 = el("a");
  a2.href = u2;
  a2.download = data.filename;
  document.body.append(a2);
  a2.click();
  a2.remove();
  setTimeout(() => URL.revokeObjectURL(u2), 5e3);
}
async function refresh() {
  const d2 = await call("keto_open");
  if (d2.state) {
    setState(d2.state);
    if (d2.shopping) renderShopping(d2.shopping);
  }
}
$2("help").onclick = () => $2("help-dialog").showModal();
$2("close-help").onclick = () => $2("help-dialog").close();
$2("close-recipe").onclick = () => $2("recipe-dialog").close();
$2("refresh").onclick = () => run(refresh);
document.querySelectorAll("[data-view]").forEach((b2) => b2.addEventListener("click", () => setView(b2.dataset.view)));
document.querySelectorAll("[data-prompt]").forEach((b2) => b2.addEventListener("click", () => {
  setView("chat");
  $2("message").value = b2.dataset.prompt;
  $2("message").focus();
}));
$2("onboard-open").onclick = $2("open-onboarding-settings").onclick = () => setView("onboarding");
$2("consent-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    accept(await call("keto_consent", { processing: $2("c-processing").checked, storage: $2("c-storage").checked, health: $2("c-health").checked, confirmed: true }));
    setView("onboarding");
  });
});
$2("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();
  send($2("message").value);
});
$2("message").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    if ($2("message").value.trim()) send($2("message").value);
  }
});
$2("recipe-search").addEventListener("submit", (e) => {
  e.preventDefault();
  run(loadRecipes);
});
$2("diary-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(() => propose("diary.add", { date: $2("diary-date").value, note: $2("diary-note").value, intake_status: "unquantified" }));
});
$2("settings-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const ui = {}, settings = {};
    for (const key of Object.keys(state.ui)) {
      const input = $2(key);
      if (input) {
        const value = input.type === "checkbox" ? input.checked : input.value;
        if (value !== state.ui[key]) ui[key] = value;
      }
    }
    for (const key of ["meals_per_day", "max_active_minutes"]) {
      const value = Number($2(key).value);
      if (value !== state.profile.settings[key]) settings[key] = value;
    }
    if (!Object.keys(ui).length && !Object.keys(settings).length) return notify("\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u043D\u0435 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0438\u0441\u044C.");
    await propose("configuration", { ui, settings });
  });
});
$2("question-prev").onclick = () => {
  questionPage--;
  renderQuestions();
};
$2("question-next").onclick = () => {
  questionPage++;
  renderQuestions();
};
$2("profile-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const old = state.profile.medications;
    const meds = $2("medications").value.split(",").map((x) => x.trim()).filter(Boolean).map((name2) => old.find((x) => x.name === name2) || { name: name2, class: "unknown" });
    const payload = { timezone: $2("timezone").value, screening: screenDraft, medications: meds, allergies: [...$2("allergy-options").querySelectorAll("input:checked")].map((x) => x.value) };
    if ($2("display-name").value.trim()) payload.display_name = $2("display-name").value.trim();
    if ($2("goal").value.trim()) payload.goal = $2("goal").value.trim();
    await propose("profile.update", payload);
  });
});
$2("targets-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const p = Object.fromEntries(new FormData(e.target));
    for (const key of Object.keys(p)) if (!["carb_basis", "basis_note"].includes(key)) p[key] = Number(p[key]);
    p.status = "agreed";
    p.agreed_at = (/* @__PURE__ */ new Date()).toISOString();
    await propose("targets.update", p);
  });
});
$2("menu-form").addEventListener("submit", (e) => {
  e.preventDefault();
  run(async () => {
    const d2 = await call("keto_menu", { start: $2("menu-start").value, days: Number($2("menu-days").value) });
    renderPlan(d2.plan);
    if (d2.shopping) renderShopping(d2.shopping);
  });
});
document.querySelectorAll("[data-export]").forEach((b2) => b2.addEventListener("click", () => run(async () => download(await call("keto_export", { format: b2.dataset.export })))));
$2("menu-import").addEventListener("change", (e) => run(async () => {
  const f = e.target.files[0];
  if (!f) return;
  if (f.size > 15e4) throw Error("\u0424\u0430\u0439\u043B \u0431\u043E\u043B\u044C\u0448\u0435 150 \u041A\u0411.");
  accept(await call("keto_import_menu", { content: await f.text(), format: f.name.toLowerCase().endsWith(".csv") ? "csv" : "json", expected_revision: state.revision }));
  $2("menu-import").closest(".panel").insertAdjacentElement("afterend", $2("proposals"));
  $2("proposals").scrollIntoView({ behavior: "smooth", block: "start" });
  e.target.value = "";
}));
$2("photo").addEventListener("change", (e) => run(async () => {
  const f = e.target.files[0];
  if (!f) return;
  if (!["image/jpeg", "image/png"].includes(f.type) || f.size > 12e6) throw Error("\u041D\u0443\u0436\u043D\u043E JPEG/PNG \u0434\u043E 12 \u041C\u0411.");
  const bitmap = await createImageBitmap(f);
  const scale = Math.min(1, 1024 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  image = canvas.toDataURL("image/jpeg", 0.8);
  $2("photo-status").textContent = "\u0424\u043E\u0442\u043E \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u043E. \u0411\u0443\u0434\u0435\u0442 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0432 Azure \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435\u043C; \u0442\u043E\u0447\u043D\u044B\u0439 \u0432\u0435\u0441 \u043F\u043E \u0444\u043E\u0442\u043E \u043D\u0435 \u043E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442\u0441\u044F.";
}));
$2("revoke").onclick = () => run(async () => {
  if (confirm("\u041E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0431\u0440\u0430\u0431\u043E\u0442\u043A\u0443 \u0432 Azure \u0438 \u043D\u043E\u0432\u044B\u0435 \u043B\u0438\u0447\u043D\u044B\u0435 \u0437\u0430\u043F\u0438\u0441\u0438? \u0421\u0442\u0430\u0440\u044B\u0439 \u0434\u043D\u0435\u0432\u043D\u0438\u043A \u043E\u0441\u0442\u0430\u043D\u0435\u0442\u0441\u044F \u0434\u043E \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u043E\u0433\u043E \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.")) accept(await call("keto_consent", { processing: false, storage: false, health: false, confirmed: true }));
});
$2("delete-data").onclick = () => run(async () => {
  if (prompt("\u0414\u043B\u044F \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F \u043B\u0438\u0447\u043D\u044B\u0445 \u0434\u0430\u043D\u043D\u044B\u0445 \u0432\u0432\u0435\u0434\u0438\u0442\u0435: \u0423\u0414\u0410\u041B\u0418\u0422\u042C") !== "\u0423\u0414\u0410\u041B\u0418\u0422\u042C") return;
  const d2 = await cfApi("/api/personal/delete", { method: "POST", body: { confirm: "DELETE_MY_DATA" } });
  sessionStorage.setItem("keto_deletion_receipt", d2.receipt);
  state = null;
  session = null;
  showLogin();
  $2("deletion-recovery").hidden = false;
  $2("deletion-status").textContent = "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u0437\u0430\u043F\u0440\u043E\u0448\u0435\u043D\u043E. \u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u0435 \u044D\u0442\u043E\u0442 \u043A\u043E\u0434: " + d2.receipt;
});
$2("logout").onclick = () => run(async () => {
  await cfApi("/api/logout", { method: "POST", body: {} });
  state = null;
  session = null;
  showLogin();
});
$2("diary-date").value = $2("menu-start").value = localDate();
async function cfApi(path, { method = "GET", body } = {}) {
  const epoch = screenEpoch;
  const r = await fetch(path, { method, headers: { ...body ? { "Content-Type": "application/json" } : {}, ...session && method !== "GET" ? { "X-CSRF-Token": session.csrf } : {} }, body: body ? JSON.stringify(body) : void 0 });
  const d2 = await r.json();
  if (epoch !== screenEpoch) throw Error("\u0421\u0435\u0430\u043D\u0441 \u0438\u0437\u043C\u0435\u043D\u0438\u043B\u0441\u044F. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u044D\u043A\u0440\u0430\u043D.");
  if (!r.ok) throw Error({ SETUP_REQUIRED: "\u0412\u0445\u043E\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D.", INVITATION_REQUIRED: "\u041D\u0443\u0436\u043D\u043E \u0434\u0435\u0439\u0441\u0442\u0432\u0443\u044E\u0449\u0435\u0435 \u043F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u0434\u043B\u044F \u044D\u0442\u043E\u0439 \u043F\u043E\u0447\u0442\u044B.", INVITE_NOT_AVAILABLE: "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435 \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u043E.", CONSENT_REQUIRED: "\u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u0440\u0430\u0437\u0440\u0435\u0448\u0438\u0442\u0435 \u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435.", IMAGE_PROCESSING_UNAVAILABLE: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u0438\u0437\u043E\u0431\u0440\u0430\u0436\u0435\u043D\u0438\u044F \u043D\u0435\u0434\u043E\u0441\u0442\u0443\u043F\u043D\u0430.", TOO_LARGE: "\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439." }[d2.error] || "\u0414\u0435\u0439\u0441\u0442\u0432\u0438\u0435 \u043D\u0435 \u0432\u044B\u043F\u043E\u043B\u043D\u0435\u043D\u043E.");
  return d2;
}
$2("source-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const f = new FormData(e.target), file = f.get("upload");
    let upload;
    if (file?.size) {
      if (file.size > 512e3 || file.type === "text/plain" && file.size > 4e3) throw Error("\u0424\u0430\u0439\u043B \u0441\u043B\u0438\u0448\u043A\u043E\u043C \u0431\u043E\u043B\u044C\u0448\u043E\u0439.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const b2 of bytes) binary += String.fromCharCode(b2);
      upload = { mime: file.type || "text/plain", data: btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "") };
    }
    await cfApi("/api/sources", { method: "POST", body: { title: f.get("title"), author: f.get("author"), url: f.get("url"), text: f.get("text"), rights_attested: f.get("rights") === "on", ...upload ? { upload } : {} } });
    e.target.reset();
    await sources();
    notify("\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D \u0434\u043B\u044F \u043B\u0438\u0447\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0430.");
  });
};
async function sources() {
  const d2 = await cfApi("/api/sources"), box = $2("source-list");
  box.replaceChildren();
  for (const s2 of d2.sources) {
    const card = document.createElement("article");
    card.className = "source";
    const title = document.createElement("h3");
    title.textContent = s2.title;
    const text = document.createElement("p");
    text.textContent = (s2.author ? s2.author + " \xB7 " : "") + { needs_content: "\u041D\u0443\u0436\u0435\u043D \u0442\u0435\u043A\u0441\u0442 \u0438\u043B\u0438 \u0434\u043E\u0441\u0442\u0443\u043F", draft: "\u0427\u0435\u0440\u043D\u043E\u0432\u0438\u043A", reviewed: "\u041F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043E", personal_recipe: "\u041B\u0438\u0447\u043D\u044B\u0439 \u0440\u0435\u0446\u0435\u043F\u0442 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D" }[s2.status] + "\n" + s2.excerpt;
    card.append(title, text);
    if (s2.mime) {
      let a2 = document.createElement("a");
      a2.href = "/api/sources/file?id=" + encodeURIComponent(s2.id);
      a2.textContent = "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0444\u0430\u0439\u043B";
      card.append(a2);
    }
    const del = document.createElement("button");
    del.textContent = "\u0423\u0434\u0430\u043B\u0438\u0442\u044C";
    del.onclick = () => run(async () => {
      await cfApi("/api/sources/delete", { method: "POST", body: { id: s2.id } });
      await sources();
    });
    card.append(del);
    if (s2.status !== "needs_content") {
      const discuss = el("button", "secondary", "\u041E\u0431\u0441\u0443\u0434\u0438\u0442\u044C");
      discuss.onclick = () => {
        attachedSource = s2.id;
        setView("chat");
        $2("message").value = "\u041E\u0431\u0441\u0443\u0434\u0438 \u044D\u0442\u043E\u0442 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A";
        $2("message").focus();
        notify("\u0418\u0441\u0442\u043E\u0447\u043D\u0438\u043A \u043F\u0440\u0438\u043A\u0440\u0435\u043F\u043B\u0451\u043D \u043A \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0435\u043C\u0443 \u0441\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u044E.");
      };
      card.append(discuss);
      const recipe = el("button", "secondary", "\u041F\u043E\u0434\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C \u0440\u0435\u0446\u0435\u043F\u0442");
      recipe.onclick = () => {
        recipeSource = s2.id;
        $2("source-recipe-form").reset();
        $2("source-recipe-dialog").showModal();
      };
      card.append(recipe);
      if (s2.status === "draft") {
        const review = el("button", "secondary", "\u041E\u0442\u043C\u0435\u0442\u0438\u0442\u044C \u043F\u0440\u043E\u0441\u043C\u043E\u0442\u0440\u0435\u043D\u043D\u044B\u043C");
        review.onclick = () => run(async () => {
          await cfApi("/api/sources/review", { method: "POST", body: { id: s2.id, reviewed: true } });
          await sources();
        });
        card.append(review);
      }
    }
    box.append(card);
  }
}
$2("invite-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    const d2 = await cfApi("/api/admin/invites", { method: "POST", body: { email: new FormData(e.target).get("email") } });
    $2("invite-link").textContent = "\u0421\u0441\u044B\u043B\u043A\u0430 \u043F\u043E\u043A\u0430\u0437\u044B\u0432\u0430\u0435\u0442\u0441\u044F \u043E\u0434\u0438\u043D \u0440\u0430\u0437: " + d2.link;
    await admin();
  });
};
async function admin() {
  const d2 = await cfApi("/api/admin/summary"), box = $2("admin-summary");
  box.replaceChildren();
  let counts = document.createElement("p");
  counts.textContent = `\u0410\u043A\u0442\u0438\u0432\u043D\u044B: ${d2.active}, \u043E\u0436\u0438\u0434\u0430\u044E\u0442: ${d2.pending}, \u0438\u0441\u0442\u0435\u043A\u043B\u0438: ${d2.expired}`;
  box.append(counts);
  for (const m of d2.members) {
    let row = document.createElement("div");
    row.className = "member";
    row.textContent = `${m.email} \xB7 ${m.status} \xB7 \u043F\u0440\u0438\u0441\u043E\u0435\u0434\u0438\u043D\u0438\u043B\u0441\u044F: ${new Date(m.joined_at * 1e3).toLocaleDateString("ru")} \xB7 \u043F\u043E\u0441\u043B\u0435\u0434\u043D\u0438\u0439 \u0432\u0445\u043E\u0434: ${new Date(m.last_active * 1e3).toLocaleDateString("ru")} \xB7 \u0437\u0430\u043F\u0440\u043E\u0441\u043E\u0432: ${m.requests} `;
    if (m.role === "member" && m.status !== "pending") {
      let b2 = document.createElement("button");
      b2.textContent = m.status === "active" ? "\u041F\u0440\u0438\u043E\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C" : "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C";
      b2.onclick = () => run(async () => {
        await cfApi("/api/admin/members/status", { method: "POST", body: { id: m.id, status: m.status === "active" ? "suspended" : "active" } });
        await admin();
      });
      row.append(b2);
    }
    box.append(row);
  }
  for (const i of d2.invites) {
    if (!i.revoked_at && !i.claimed_by && i.expires_at > Date.now() / 1e3) {
      let row = document.createElement("div");
      row.className = "member";
      row.textContent = "\u041F\u0440\u0438\u0433\u043B\u0430\u0448\u0435\u043D\u0438\u0435: " + i.email + " ";
      let b2 = document.createElement("button");
      b2.textContent = "\u041E\u0442\u043E\u0437\u0432\u0430\u0442\u044C";
      b2.onclick = () => run(async () => {
        await cfApi("/api/admin/invites/revoke", { method: "POST", body: { id: i.id } });
        await admin();
      });
      row.append(b2);
      box.append(row);
    }
  }
}
$2("sr-close").onclick = () => $2("source-recipe-dialog").close();
$2("source-recipe-form").onsubmit = (e) => {
  e.preventDefault();
  run(async () => {
    if (!recipeSource) throw Error("\u0412\u044B\u0431\u0435\u0440\u0438\u0442\u0435 \u0438\u0441\u0442\u043E\u0447\u043D\u0438\u043A.");
    const states = { "\u0441\u044B\u0440\u043E\u0439": "raw", "\u0433\u043E\u0442\u043E\u0432\u044B\u0439": "ready_to_eat", "\u0437\u0430\u043F\u0435\u0447\u0451\u043D\u043D\u044B\u0439": "cooked_roasted", "\u0432\u0430\u0440\u0451\u043D\u044B\u0439": "cooked_boiled", "\u0441\u0443\u0445\u043E\u0439": "dry", "\u043A\u043E\u043D\u0441\u0435\u0440\u0432\u0438\u0440\u043E\u0432\u0430\u043D\u043D\u044B\u0439": "canned", "\u0431\u0435\u0437 \u0436\u0438\u0434\u043A\u043E\u0441\u0442\u0438": "canned_drained", "\u0433\u043E\u0442\u043E\u0432\u0438\u0442\u044C": "ready_to_cook", "\u0441\u0443\u0445\u043E\u0439 \u0436\u0430\u0440": "cooked_dry_heat", "\u043F\u0440\u0438\u0433\u043E\u0442\u043E\u0432\u043B\u0435\u043D\u043D\u044B\u0439": "cooked" };
    const ingredients = $2("sr-ingredients").value.split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
      const parts = line.split(";").map((x) => x.trim());
      const grams = Number((parts[1] || "").replace(",", ".")), st = states[(parts[2] || "").toLowerCase()];
      if (parts.length !== 3 || !/^[FU][A-Za-z0-9_-]+$/.test(parts[0]) || !Number.isFinite(grams) || grams <= 0 || !st) throw Error("\u041F\u0440\u043E\u0432\u0435\u0440\u044C\u0442\u0435 \u043A\u0430\u0436\u0434\u0443\u044E \u0441\u0442\u0440\u043E\u043A\u0443: \u043A\u043E\u0434; \u0433\u0440\u0430\u043C\u043C\u044B; \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u0435.");
      return { food_id: parts[0], grams_edible: grams, state: st };
    });
    if (!ingredients.length || ingredients.length > 20) throw Error("\u0423\u043A\u0430\u0436\u0438\u0442\u0435 \u043E\u0442 1 \u0434\u043E 20 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u043E\u0432.");
    const payload = { recipe_id: "R" + crypto.randomUUID().replaceAll("-", ""), name_ru: $2("sr-name").value, category: $2("sr-category").value, protein_family: "other", base_servings: Number($2("sr-servings").value), active_minutes: Number($2("sr-minutes").value), ingredients, steps_ru: $2("sr-steps").value };
    const d2 = await call("keto_propose_change", { event_type: "catalog.recipe.add", payload, expected_revision: state.revision, source_id: recipeSource });
    $2("source-recipe-dialog").close();
    accept(d2);
    $2("proposals").scrollIntoView({ behavior: "smooth", block: "start" });
  });
};
$2("cf-login").onclick = () => run(async () => {
  if (!loginConfig) throw Error("\u0412\u0445\u043E\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D. \u041E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u0443.");
  const invite = sessionStorage.getItem("keto_invite") || "";
  if (loginConfig.provider === "firebase_google") {
    await firebaseLogin(loginConfig.firebase, invite, (path, body) => cfApi(path, { method: "POST", body }));
    await start();
    return;
  }
  if (loginConfig.provider === "direct_google") {
    const d2 = await cfApi("/auth/google/start", { method: "POST", body: { invite } });
    location.assign(d2.authorization_url);
    return;
  }
  throw Error("\u0412\u0445\u043E\u0434 \u043F\u043E\u043A\u0430 \u043D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D.");
});
$2("cf-claim-button").onclick = () => run(async () => {
  await cfApi("/api/invites/claim", { method: "POST", body: { token: sessionStorage.getItem("keto_invite") || "" } });
  sessionStorage.removeItem("keto_invite");
  await start();
});
$2("cf-switch").onclick = () => run(async () => {
  await cfApi("/api/logout", { method: "POST", body: {} });
  session = null;
  showLogin();
});
$2("continue-deletion").onclick = () => run(async () => {
  const receipt = sessionStorage.getItem("keto_deletion_receipt") || $2("deletion-code").value.trim();
  if (!receipt) {
    $2("deletion-status").textContent = "\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0441\u043E\u0445\u0440\u0430\u043D\u0451\u043D\u043D\u044B\u0439 \u043A\u043E\u0434 \u0443\u0434\u0430\u043B\u0435\u043D\u0438\u044F.";
    return;
  }
  const d2 = await cfApi("/api/deletion/continue", { method: "POST", body: { receipt } });
  $2("deletion-status").textContent = d2.status === "complete" ? "\u0410\u043A\u0442\u0438\u0432\u043D\u044B\u0435 \u0434\u0430\u043D\u043D\u044B\u0435 \u0443\u0434\u0430\u043B\u0435\u043D\u044B. \u041F\u043E\u043B\u0438\u0442\u0438\u043A\u0430 \u0440\u0435\u0437\u0435\u0440\u0432\u043D\u044B\u0445 \u043A\u043E\u043F\u0438\u0439 \u043E\u0442\u0434\u0435\u043B\u044C\u043D\u0430\u044F." : "\u0423\u0434\u0430\u043B\u0435\u043D\u0438\u0435 \u043F\u0440\u043E\u0434\u043E\u043B\u0436\u0430\u0435\u0442\u0441\u044F; \u043F\u043E\u0432\u0442\u043E\u0440\u0438\u0442\u0435 \u043F\u0440\u043E\u0432\u0435\u0440\u043A\u0443 \u043F\u043E\u0437\u0436\u0435. \u041A\u043E\u0434: " + receipt;
  if (d2.status === "complete") sessionStorage.removeItem("keto_deletion_receipt");
});
async function start() {
  const url = new URL(location.href), incoming = url.searchParams.get("invite");
  if (incoming) {
    sessionStorage.setItem("keto_invite", incoming);
    url.searchParams.delete("invite");
    history.replaceState(null, "", url.pathname + url.search + url.hash);
  }
  $2("deletion-code").value = sessionStorage.getItem("keto_deletion_receipt") || "";
  try {
    const r = await fetch("/auth/config");
    loginConfig = r.ok ? await r.json() : null;
  } catch {
    loginConfig = null;
  }
  try {
    session = await cfApi("/api/session");
    csrf = session.csrf;
    if (session.user.status === "pending") {
      showLogin();
      $2("cf-claim").hidden = false;
      $2("cf-login-message").textContent = "\u0410\u043A\u043A\u0430\u0443\u043D\u0442: " + session.user.email;
      return;
    }
    $2("cf-claim").hidden = true;
    $2("admin-tab").hidden = session.user.role !== "admin";
    await refresh();
    setView(state.ui.home);
  } catch (e) {
    session = null;
    showLogin();
    $2("cf-login-message").textContent = e.message;
  }
}
run(start);
