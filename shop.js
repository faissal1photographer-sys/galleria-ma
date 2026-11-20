"use strict";

const { products, prints, finishes, sizes, whatsapp } = window.GALERIA;
const catalog = new Map(products.map(product => [product.id, product]));
// Keep frame lines from earlier previews readable while requiring options for new requests.
catalog.set("cadre", { id: "cadre", label: "legacyFrame", price: null });
function frameId(print, finish, size) {
  return ["frame", print, finish, size].join("-");
}
for (const print of prints) {
  for (const finish of finishes) {
    for (const size of sizes) {
      const id = frameId(print.id, finish.id, size.id);
      catalog.set(id, { id, print, finish, size, price: null });
    }
  }
}
const cartKey = "galeria-cart-v1";
const languageKey = "galeria-language-v1";
const languages = ["fr", "en", "ar"];
const candleGrid = document.querySelector("#candle-grid");
const frameForm = document.querySelector("#frame-configurator");
let language = "fr";
let amount;

function t(key, values = {}) {
  return window.GALERIA_COPY[key][languages.indexOf(language)].replace(
    /\{(\w+)\}/g, (_, token) => values[token]
  );
}

function productName(product) {
  if (product.print) {
    return t("frameOrder", {
      print: t(product.print.label),
      finish: t(product.finish.label),
      size: t(product.size.label)
    });
  }
  return t(product.label || product.id + "Name");
}
const dialog = document.querySelector("#cart");
const checkout = document.querySelector("#checkout");
const orderText = document.querySelector("#message");
const cityField = document.querySelector("#city");
const orderButton = document.querySelector("#send-order");
const cartItems = document.querySelector("#cart-items");
const bag = document.querySelector("#open-cart");
const maxQuantity = 99;
const hasWhatsApp = /^[1-9]\d{7,14}$/.test(whatsapp);
let opener;
let cart = {};

try {
  const savedLanguage = localStorage.getItem(languageKey);
  if (languages.includes(savedLanguage)) language = savedLanguage;
  const saved = JSON.parse(localStorage.getItem(cartKey) || "{}");
  for (const id of catalog.keys()) {
    const quantity = saved?.[id];
    if (Number.isInteger(quantity) && quantity > 0) {
      cart[id] = Math.min(quantity, maxQuantity);
    }
  }
} catch {
  // The cart remains usable in memory when storage is blocked.
}

function element(tag, className, value) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (value) node.textContent = value;
  return node;
}

function priceLabel(price) {
  return price === null ? t("pricePending") : amount.format(price) + " " + t("currency");
}

function addControl(product) {
  const button = element("button", "button dark add-button", t("add"));
  button.type = "button";
  button.setAttribute("aria-label", t("addProduct", { name: productName(product) }));
  button.addEventListener("click", () => {
    addToCart(product, button);
  });
  return button;
}

function addToCart(product, trigger) {
  updateQuantity(product.id, (cart[product.id] || 0) + 1);
  document.querySelector("#status").textContent =
    t("itemAdded", { quantity: amount.format(cart[product.id]), name: productName(product) });
  openCart(trigger);
}

function candleProduct(product, isDetail) {
  const article = element("article", "product");
  if (product.image) {
    const photo = element("figure", "photo");
    const image = element("img");
    image.src = product.image;
    image.alt = t(product.id + "Alt");
    image.loading = "lazy";
    image.width = product.width;
    image.height = product.height;
    photo.append(image);
    article.append(photo);
  }

  const description = element("div", "product-body");
  const name = productName(product);
  const heading = element(isDetail ? "h1" : "h2", "", isDetail ? name : "");
  if (!isDetail) {
    const link = element("a", "", name);
    link.href = window.GALLERIA_PREVIEW ? "#" + product.id : product.id + ".html";
    heading.append(link);
  }
  description.append(
    heading,
    element("p", "", t(product.id + "Description")),
    element("p", "materials", t("candleMaterials"))
  );
  const actions = element("div", "product-actions");
  const price = element("span", "price", priceLabel(product.price));
  actions.append(price, addControl(product));
  if (!isDetail) {
    const details = element("a", "quiet product-link", t("productDetails"));
    details.href = heading.firstElementChild.getAttribute("href");
    details.setAttribute("aria-label", t("productDetailsFor", { name }));
    actions.append(details);
  }
  description.append(actions);
  article.append(description);
  return article;
}

function renderProducts() {
  if (candleGrid) {
    candleGrid.replaceChildren(...products.map(product => candleProduct(product, false)));
  }
  for (const detail of document.querySelectorAll("[data-product-detail]")) {
    const product = catalog.get(detail.dataset.productDetail);
    detail.replaceChildren(candleProduct(product, true));
  }
  if (frameForm) renderFrameOptions();
}

function renderFrameOptions() {
  const selection = new FormData(frameForm);
  const gallery = frameForm.querySelector("#print-gallery");
  gallery.replaceChildren(...prints.map(print => {
    const card = element("label", "print-option");
    const radio = element("input");
    radio.type = "radio";
    radio.name = "print";
    radio.value = print.id;
    radio.required = true;
    radio.checked = selection.get("print") === print.id;

    const image = element("img");
    image.src = print.image;
    image.alt = "";
    image.loading = "lazy";
    image.width = print.width;
    image.height = print.height;
    const display = element("span", "print-display");
    display.append(image, element("span", "print-label", t(print.label)));
    card.append(radio, display);
    return card;
  }));

  for (const [name, choices] of [["finish", finishes], ["size", sizes]]) {
    const select = frameForm.elements.namedItem(name);
    const empty = new Option(t("chooseOption"), "");
    empty.disabled = true;
    select.replaceChildren(empty, ...choices.map(choice => new Option(t(choice.label), choice.id)));
    select.value = selection.get(name) || "";
  }
}

frameForm?.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(frameForm);
  const id = frameId(data.get("print"), data.get("finish"), data.get("size"));
  const product = catalog.get(id);
  if (product) addToCart(product, event.submitter || frameForm.querySelector('button[type="submit"]'));
});

function openCart(trigger) {
  opener = trigger;
  dialog.showModal();
  document.querySelector("#close-cart").focus();
}

function updateQuantity(id, value, nextFocus) {
  if (value > 0) cart[id] = Math.min(value, maxQuantity);
  else delete cart[id];
  try {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  } catch {
    // Orders can still be prepared when storage is unavailable.
  }
  renderCart();
  if (nextFocus) {
    const matchingButton = document.getElementById(nextFocus);
    const fallback = cartItems.querySelector("button:not([disabled])");
    (matchingButton && !matchingButton.disabled ? matchingButton : fallback || document.querySelector("#close-cart")).focus();
  }
}

function cartSummary() {
  const lines = Object.entries(cart).map(([id, quantity]) => ({
    product: catalog.get(id),
    quantity
  }));
  const count = lines.reduce((total, item) => total + item.quantity, 0);
  const knownAmount = lines.reduce((total, { product, quantity }) => total + (product.price ?? 0) * quantity, 0);
  const unknownPrices = lines.filter(({ product }) => product.price === null).length;
  let subtotal = priceLabel(knownAmount);
  if (unknownPrices === lines.length && lines.length) subtotal = t("toConfirm");
  else if (unknownPrices) subtotal += " " + t("partialTotal");
  return { lines, count, subtotal };
}

function quantityControl(product, quantity, delta) {
  const increasing = delta === 1;
  const button = element("button", "icon-button", increasing ? "+" : "−");
  button.type = "button";
  button.id = product.id + (increasing ? "-more" : "-less");
  button.disabled = increasing && quantity >= maxQuantity;
  button.setAttribute("aria-label", t(increasing ? "more" : "less", { name: productName(product) }));
  button.addEventListener("click", () => updateQuantity(product.id, quantity + delta, button.id));
  return button;
}

function renderCart() {
  const { lines, count, subtotal } = cartSummary();
  cartItems.replaceChildren();
  for (const { product, quantity } of lines) {
    const row = element("li", "cart-item");
    const itemDescription = element("div");
    itemDescription.append(element("strong", "", productName(product)), element("div", "cart-note", priceLabel(product.price)));
    const controls = element("div", "quantity");
    controls.append(quantityControl(product, quantity, -1), element("span", "", amount.format(quantity)), quantityControl(product, quantity, 1));
    row.append(itemDescription, controls);
    cartItems.append(row);
  }
  document.querySelector("#cart-count").textContent = amount.format(count);
  bag.setAttribute("aria-label", t("cartCount", { count: amount.format(count) }));
  document.querySelector("#empty-cart").hidden = Boolean(count);
  checkout.hidden = !count;
  document.querySelector("#total").textContent = subtotal;
  orderText.hidden = true;
}

document.querySelector("#add-duo")?.addEventListener("click", event => {
  updateQuantity("amber", (cart.amber || 0) + 1);
  updateQuantity("oud", (cart.oud || 0) + 1);
  document.querySelector("#status").textContent = t("duoAdded");
  openCart(event.currentTarget);
});
bag.addEventListener("click", () => openCart(bag));
document.querySelector("#close-cart").addEventListener("click", () => dialog.close());
document.querySelector("#continue-shopping").addEventListener("click", () => dialog.close());
dialog.addEventListener("close", () => opener?.focus());
dialog.addEventListener("click", event => {
  if (event.target === dialog) dialog.close();
});
cityField.addEventListener("input", () => {
  cityField.setCustomValidity("");
  orderText.hidden = true;
});

function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  const pageTitle = document.querySelector("#main").dataset.pageTitle;
  document.title = pageTitle === "title" ? t("title") : t(pageTitle) + " · Galleria";
  document.querySelector('meta[name="description"]').content = t("meta");
  amount = new Intl.NumberFormat(language + "-MA", { maximumFractionDigits: 2 });
  for (const node of document.querySelectorAll("[data-copy]")) {
    const copy = t(node.dataset.copy);
    node.textContent = copy;
    node.hidden = !copy;
  }
  for (const [attribute, data] of [["aria-label", "aria"], ["alt", "alt"], ["placeholder", "placeholder"]]) {
    for (const node of document.querySelectorAll("[data-" + data + "]")) {
      node.setAttribute(attribute, t(node.dataset[data]));
    }
  }
  for (const button of document.querySelectorAll("[data-language]")) {
    button.setAttribute("aria-pressed", String(button.dataset.language === language));
  }
  cityField.setCustomValidity("");
  orderButton.textContent = t(hasWhatsApp ? "placeOrder" : "previewOrder");
  document.querySelector("#preview-note").hidden = hasWhatsApp;
  renderProducts();
  renderCart();
}

for (const button of document.querySelectorAll("[data-language]")) {
  button.addEventListener("click", () => {
    language = button.dataset.language;
    try {
      localStorage.setItem(languageKey, language);
    } catch {
      // The active language still applies to this page when storage is blocked.
    }
    applyLanguage();
  });
}

checkout.addEventListener("submit", event => {
  event.preventDefault();
  const city = cityField.value.trim();
  if (!city) {
    cityField.setCustomValidity(t("cityRequired"));
    cityField.reportValidity();
    return;
  }
  const { lines, subtotal } = cartSummary();
  if (!lines.length) return;
  const items = lines.map(({ product, quantity }) => "• " + amount.format(quantity) + " × " + productName(product));
  const message = [
    t("messageGreeting"),
    ...items,
    "",
    t("subtotal") + ": " + subtotal,
    t("city") + ": " + city,
    "",
    t("messageConfirm")
  ].join("\n");

  if (hasWhatsApp) {
    const destination = new URL("https://wa.me/" + whatsapp);
    destination.searchParams.set("text", message);
    window.location.assign(destination.href);
  } else {
    orderText.value = message;
    orderText.hidden = false;
    orderText.focus();
  }
});

applyLanguage();
