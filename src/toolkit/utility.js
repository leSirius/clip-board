import CryptoJS from "crypto-js";

const iv = new Array(16).fill(String.fromCharCode(0)).join('');
const ivEncoded   = CryptoJS.enc.Utf8.parse(iv);
const encryptSetting = {
  iv: ivEncoded,
  mode: CryptoJS.mode.ECB,
  padding: CryptoJS.pad.Pkcs7
}
export const postSetting = {
  method: 'POST',
  headers: {'Content-Type': 'application/json'}
}

export function cipher(text, key) {
  let keyEncoded  = CryptoJS.enc.Utf8.parse(key);
  return CryptoJS.AES.encrypt(text, keyEncoded, encryptSetting).toString();
}

export function decipher(encrypted, key) {
  let keyEncoded  = CryptoJS.enc.Utf8.parse(key);
  return CryptoJS.AES.decrypt(encrypted, keyEncoded, encryptSetting).toString(CryptoJS.enc.Utf8);
}

export function getTimeStamp() { return new Date().getTime(); }

export async function makeFetch(url, isPost=false, body) {
  try {
    let res;
    if (!isPost) { res = await fetch(url); }
    else { res = await fetch(url, {...postSetting, body}); }
    checkRes(res);
  } catch (e) {
    console.error('----------error---------', e.message);
  }
}

function checkRes(res) {
  if (!res.ok || res.status !== 200) { throw new Error(`failed to send text: ${res.status}`) }
}

export const storageFunc = {
  has(k) { return localStorage.getItem(k)!==null; },

  get(k) {
    const val = localStorage.getItem(k);
    return val!==null? val:void 0;
  },

  getIterable(keys){
    if (typeof keys==='string') { return this.get(keys); }
    if (!keys[Symbol.iterator]) {
      throw Error(`Non-iterable keys for storageFunc.getMore, the crime is ${keys}`)
    }
    const result = [];
    for (const key of keys) { result.push(this.getIterable(key)); }
    return result;
  },

  set(k, v) { localStorage.setItem(k, v); },

  setFromArray(items) {
    if (!Array.isArray(items)) {
      throw Error(`Bad itemList for storageFunc.setFromArray, the crime is ${items}`);
    }
    for (const item of items) {
      if (!Array.isArray(item)||item.length!==2||typeof item[0]!=='string'||typeof item[1]!=='string'){
        throw Error(`Bad item for storageFunc.setFromArray, the crime is ${item}`);
      }
      this.set(item[0], item[1]);
    }
  },

  delete(k) { localStorage.removeItem(k); },

  clear() { localStorage.clear(); }
}