// @ts-check
/**
 * Tiny, safe DOM helpers. User data is always set with textContent, never innerHTML.
 */

/**
 * @typedef {Object} HProps
 * @property {string} [class]            CSS class(es)
 * @property {Record<string,string|number|boolean>} [dataset]  data-* attributes
 * @property {Record<string,string|number|boolean|null>} [attrs] any other attributes (aria-*, role, …)
 * @property {string} [text]             text content
 * @property {(ev: Event) => void} [onclick]
 * @property {(ev: Event) => void} [oninput]
 * @property {(ev: Event) => void} [onchange]
 * @property {(ev: Event) => void} [onsubmit]
 * @property {(ev: KeyboardEvent) => void} [onkeydown]
 */

/**
 * Create an element.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {HProps & Record<string, any>} [props]
 * @param {...(Node|string|number|null|undefined|false|Array<Node|string|number|null|undefined|false>)} children
 * @returns {HTMLElementTagNameMap[K]}
 * @example h("button", { class: "btn btn--primary", onclick: save }, "Save")
 */
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value === undefined || value === null || value === false) continue;
    if (key === "class") el.className = String(value);
    else if (key === "text") el.textContent = String(value);
    else if (key === "dataset") Object.assign(el.dataset, value);
    else if (key === "attrs") {
      for (const [a, v] of Object.entries(value)) {
        if (v === null || v === false) continue;
        el.setAttribute(a, v === true ? "" : String(v));
      }
    } else if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in el) {
      /** @type {any} */ (el)[key] = value;
    } else {
      el.setAttribute(key, value === true ? "" : String(value));
    }
  }
  append(el, children);
  return el;
}

/**
 * Append children (strings become text nodes, arrays are flattened, falsy values skipped).
 * @param {Node} parent
 * @param {any} children
 */
export function append(parent, children) {
  for (const child of [children].flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    parent.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

/**
 * Remove all children of a node, optionally adding new ones.
 * @param {Node} node
 * @param {...any} children
 */
export function replaceChildrenOf(node, ...children) {
  node.textContent = "";
  append(node, children);
}

/**
 * querySelector that throws a helpful error when missing.
 * @template {Element} T
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {T}
 */
export function $(selector, root = document) {
  const el = /** @type {T | null} */ (root.querySelector(selector));
  if (!el) throw new Error(`Element not found: ${selector}`);
  return el;
}

/**
 * querySelectorAll as a real array.
 * @param {string} selector
 * @param {ParentNode} [root]
 * @returns {Element[]}
 */
export function $$(selector, root = document) {
  return Array.from(root.querySelectorAll(selector));
}

/**
 * Clone the content of a <template id="…">.
 * @param {string} id
 * @returns {DocumentFragment}
 */
export function fromTemplate(id) {
  const tpl = /** @type {HTMLTemplateElement | null} */ (document.getElementById(id));
  if (!tpl) throw new Error(`Template not found: ${id}`);
  return /** @type {DocumentFragment} */ (tpl.content.cloneNode(true));
}
