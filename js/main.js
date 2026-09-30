/* Razeehn — minimal vanilla JS: mobile menu, floating WhatsApp bar, footer year.
   No forms and no tracking: nothing is sent anywhere. Bookings happen on WhatsApp. */
(function () {
  "use strict";
  var ar = (document.documentElement.lang || "en").slice(0, 2).toLowerCase() === "ar";
  var T = ar ? { open: "فتح القائمة", close: "إغلاق القائمة" } : { open: "Open menu", close: "Close menu" };

  // Mobile menu (closes on link tap and on Escape)
  var btn = document.querySelector(".menu-btn");
  var nav = document.getElementById("nav");
  function setMenu(open) {
    nav.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.setAttribute("aria-label", open ? T.close : T.open);
  }
  if (btn && nav) {
    btn.addEventListener("click", function () { setMenu(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); btn.focus(); }
    });
  }

  // Colour option B preview for the owner only: add ?theme=b to the address (not saved, visitors always see A)
  if (new URLSearchParams(location.search).get("theme") === "b") document.documentElement.setAttribute("data-theme", "b");

  // Floating "Book a session" + WhatsApp bar on phones: shown after the top section, hidden at the Book section
  var sticky = document.querySelector(".sticky-cta");
  var hero = document.querySelector(".hero");
  var book = document.getElementById("book");
  if (sticky && hero && "IntersectionObserver" in window) {
    var heroVisible = true, bookVisible = false;
    var update = function () { sticky.classList.toggle("show", !heroVisible && !bookVisible); };
    new IntersectionObserver(function (e) { heroVisible = e[0].isIntersecting; update(); }).observe(hero);
    if (book) new IntersectionObserver(function (e) { bookVisible = e[0].isIntersecting; update(); }).observe(book);
  }

  var y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();
})();
