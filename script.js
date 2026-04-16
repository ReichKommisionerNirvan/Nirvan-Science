(() => {
  const navToggle = document.querySelector(".nav-toggle");
  const navMenu = document.querySelector("#nav-menu");
  const toTopBtn = document.querySelector("[data-to-top]");
  const actionForm = document.querySelector("#action-form");
  const resultEl = document.querySelector("#result");
  const clearBtn = document.querySelector("#clear-btn");
  const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;

  function setMenuOpen(open) {
    if (!navToggle || !navMenu) return;
    navToggle.setAttribute("aria-expanded", String(open));
    navMenu.setAttribute("data-open", String(open));
  }

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navToggle.getAttribute("aria-expanded") === "true";
      setMenuOpen(!isOpen);
    });

    navMenu.addEventListener("click", (e) => {
      const target = e.target;
      if (target instanceof HTMLAnchorElement) setMenuOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    });

    document.addEventListener("click", (e) => {
      if (!navMenu.hasAttribute("data-open")) return;
      const isOpen = navMenu.getAttribute("data-open") === "true";
      if (!isOpen) return;
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (navMenu.contains(target) || navToggle.contains(target)) return;
      setMenuOpen(false);
    });
  }

  function updateToTop() {
    if (!toTopBtn) return;
    const show = window.scrollY > 450;
    toTopBtn.setAttribute("data-visible", String(show));
  }

  if (toTopBtn) {
    updateToTop();
    window.addEventListener("scroll", updateToTop, { passive: true });
    toTopBtn.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function escapeHtml(str) {
    return str
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function renderError(message) {
    if (!resultEl) return;
    resultEl.innerHTML = `<div class="error">${escapeHtml(message)}</div>`;
  }

  function renderChecklist({ name, items }) {
    if (!resultEl) return;
    const safeName = name ? escapeHtml(name) : "Friend";

    const lines = items
      .map((i) => `<li>${escapeHtml(i)}</li>`)
      .join("");

    resultEl.innerHTML = `
      <div>
        <p style="margin:0 0 8px"><strong>${safeName}'s checklist</strong></p>
        <ul class="list" style="margin:0; padding-left:18px">${lines}</ul>
        <p class="muted" style="margin:10px 0 0">Tip: press Ctrl+P to print or save as PDF.</p>
      </div>
    `;
  }

  function clearForm() {
    if (!actionForm) return;
    actionForm.reset();
    if (resultEl) resultEl.textContent = "";
  }

  if (clearBtn) clearBtn.addEventListener("click", clearForm);

  if (actionForm) {
    actionForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const formData = new FormData(actionForm);
      const items = formData.getAll("focus").map(String);
      const name = String(formData.get("name") || "").trim();

      if (items.length === 0) {
        renderError("Pick at least one focus area to generate your checklist.");
        return;
      }

      renderChecklist({ name, items });
    });
  }

  // Scroll reveal
  const revealEls = Array.from(document.querySelectorAll("[data-reveal]"));
  if (revealEls.length > 0) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.classList.add("is-visible"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        },
        { root: null, threshold: 0.14 }
      );
      revealEls.forEach((el) => io.observe(el));
    }
  }

  // KPI counters
  const kpis = Array.from(document.querySelectorAll("[data-count]"));
  function animateNumber(el) {
    const rawTarget = el.getAttribute("data-count");
    if (!rawTarget) return;
    const target = Number(rawTarget);
    if (!Number.isFinite(target)) return;

    const decimals = Number(el.getAttribute("data-decimals") || "0");
    const suffix = el.getAttribute("data-suffix") || "";
    const durationMs = 900;
    const start = performance.now();
    const from = 0;

    function tick(now) {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = from + (target - from) * eased;
      el.textContent = `${value.toFixed(decimals)}${suffix}`;
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  if (kpis.length > 0) {
    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      kpis.forEach((el) => animateNumber(el));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            animateNumber(entry.target);
            io.unobserve(entry.target);
          }
        },
        { threshold: 0.5 }
      );
      kpis.forEach((el) => io.observe(el));
    }
  }

  // Quiz
  const quizRoot = document.querySelector("[data-quiz]");
  const scoreEl = quizRoot?.querySelector("[data-score]") ?? null;
  const quizResetBtn = quizRoot?.querySelector("[data-quiz-reset]") ?? null;
  const answers = /** @type {Record<string, number>} */ ({});

  function computeScore() {
    return Object.values(answers).reduce((sum, v) => sum + (v === 1 ? 1 : 0), 0);
  }

  function renderScore() {
    if (!scoreEl) return;
    scoreEl.textContent = String(computeScore());
  }

  function resetQuiz() {
    if (!quizRoot) return;
    for (const key of Object.keys(answers)) delete answers[key];
    quizRoot.querySelectorAll("[data-state]").forEach((btn) => btn.removeAttribute("data-state"));
    quizRoot.querySelectorAll(".quiz-opt[disabled]").forEach((btn) => btn.removeAttribute("disabled"));
    renderScore();
  }

  if (quizRoot) {
    quizRoot.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof HTMLElement)) return;
      const btn = target.closest?.(".quiz-opt");
      if (!(btn instanceof HTMLButtonElement)) return;
      const q = btn.getAttribute("data-q");
      const a = Number(btn.getAttribute("data-a") || "0");
      if (!q) return;

      // lock the question after one pick
      if (Object.prototype.hasOwnProperty.call(answers, q)) return;
      answers[q] = a === 1 ? 1 : 0;

      // mark states in the group
      const group = quizRoot.querySelectorAll(`.quiz-opt[data-q="${CSS.escape(q)}"]`);
      group.forEach((b) => {
        const isCorrect = (b.getAttribute("data-a") || "0") === "1";
        b.setAttribute("data-state", isCorrect ? "correct" : b === btn ? "wrong" : "");
        if (b.getAttribute("data-state") === "") b.removeAttribute("data-state");
        b.setAttribute("disabled", "true");
      });
      renderScore();
    });
  }
  if (quizResetBtn) quizResetBtn.addEventListener("click", resetQuiz);

  // Estimator
  const estForm = document.querySelector("[data-estimator]");
  if (estForm instanceof HTMLFormElement) {
    const beef = estForm.elements.namedItem("beef");
    const plant = estForm.elements.namedItem("plant");
    const beefOut = estForm.elements.namedItem("beefOut");
    const plantOut = estForm.elements.namedItem("plantOut");
    const impactEl = estForm.querySelector("[data-impact]");
    const impactFill = estForm.querySelector("[data-impact-fill]");
    const impactBar = estForm.querySelector('[role="progressbar"]');

    function setOut(out, value) {
      if (out instanceof HTMLOutputElement) out.value = String(value);
      else if (out instanceof HTMLElement) out.textContent = String(value);
    }

    function calcImpact(beefMeals, plantMeals) {
      // Simple classroom model: beef adds more "impact points", plant meals reduce it slightly.
      const beefWeight = 7;
      const plantCredit = 2;
      const raw = beefMeals * beefWeight + Math.max(0, 14 - plantMeals) * 1.5 - plantMeals * plantCredit;
      const maxRaw = 14 * beefWeight + 14 * 1.5; // ~119
      const pct = Math.max(0, Math.min(100, (raw / maxRaw) * 100));
      return { raw: Math.max(0, raw), pct };
    }

    function updateEstimator() {
      const beefMeals = beef instanceof HTMLInputElement ? Number(beef.value) : 0;
      const plantMeals = plant instanceof HTMLInputElement ? Number(plant.value) : 0;
      setOut(beefOut, beefMeals);
      setOut(plantOut, plantMeals);

      const { raw, pct } = calcImpact(beefMeals, plantMeals);
      if (impactEl) impactEl.textContent = String(Math.round(raw));
      if (impactFill instanceof HTMLElement) impactFill.style.width = `${pct.toFixed(1)}%`;
      if (impactBar instanceof HTMLElement) impactBar.setAttribute("aria-valuenow", String(Math.round(pct)));
    }

    estForm.addEventListener("input", updateEstimator, { passive: true });
    updateEstimator();
  }

  // Tilt (subtle, optional)
  if (!prefersReducedMotion) {
    const tiltEls = Array.from(document.querySelectorAll("[data-tilt]"));
    tiltEls.forEach((el) => {
      if (!(el instanceof HTMLElement)) return;
      el.addEventListener("pointermove", (e) => {
        const rect = el.getBoundingClientRect();
        const px = (e.clientX - rect.left) / rect.width;
        const py = (e.clientY - rect.top) / rect.height;
        const rx = (py - 0.5) * -8;
        const ry = (px - 0.5) * 10;
        el.style.transform = `perspective(900px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    });
  }
})();

