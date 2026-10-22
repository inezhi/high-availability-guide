(function () {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const store = {
    get(key, fallback) {
      try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : value;
      } catch (error) {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        /* storage can be unavailable */
      }
    }
  };

  /* ------------------------------------------------------------------
     Theme
     ------------------------------------------------------------------ */

  const docEl = document.documentElement;
  const themeToggle = $("#themeToggle");
  const themeMeta = $('meta[name="theme-color"]');

  function applyTheme(theme) {
    docEl.setAttribute("data-theme", theme);
    if (themeMeta) {
      themeMeta.setAttribute("content", theme === "light" ? "#ffffff" : "#08121b");
    }
    if (themeToggle) {
      themeToggle.setAttribute(
        "aria-label",
        theme === "light" ? "切换到深色主题" : "切换到浅色主题"
      );
    }
  }

  applyTheme(store.get("ha-theme", "light"));

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      const next = docEl.getAttribute("data-theme") === "light" ? "dark" : "light";
      applyTheme(next);
      store.set("ha-theme", next);
    });
  }

  /* ------------------------------------------------------------------
     Mobile index
     ------------------------------------------------------------------ */

  const mobileBar = $(".mobile-bar");
  const mobileIndex = $("#mobileIndex");
  const menuToggle = $("#menuToggle");

  function closeMobileIndex() {
    if (!mobileBar || !mobileIndex || !menuToggle) return;
    mobileBar.classList.remove("is-open");
    mobileIndex.classList.remove("is-open");
    menuToggle.setAttribute("aria-expanded", "false");
  }

  if (mobileBar && mobileIndex && menuToggle) {
    menuToggle.addEventListener("click", function () {
      const open = !mobileIndex.classList.contains("is-open");
      mobileBar.classList.toggle("is-open", open);
      mobileIndex.classList.toggle("is-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
    });

    $$("a", mobileIndex).forEach(function (link) {
      link.addEventListener("click", closeMobileIndex);
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeMobileIndex();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 1080) closeMobileIndex();
    });
  }

  /* ------------------------------------------------------------------
     Reading progress and section tracking
     ------------------------------------------------------------------ */

  const progressBar = $("#progressBar");
  const railProgress = $("#railProgress");
  const toTop = $("#toTop");
  const tocLinks = $$(".toc-link, .toc-mobile a");
  const tocTargets = [];

  tocLinks.forEach(function (link) {
    const id = decodeURIComponent((link.getAttribute("href") || "").replace(/^#/, ""));
    if (!id) return;
    const target = document.getElementById(id);
    if (target && !tocTargets.some(function (item) { return item.id === id; })) {
      tocTargets.push({ id: id, el: target });
    }
  });

  const tocMobile = $(".toc-mobile");
  if (tocMobile) {
    $$("a", tocMobile).forEach(function (link) {
      link.addEventListener("click", function () {
        tocMobile.removeAttribute("open");
      });
    });
  }

  let scrollQueued = false;

  function updateScrollState() {
    const max = docEl.scrollHeight - window.innerHeight;
    const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const percent = (ratio * 100).toFixed(2) + "%";

    if (progressBar) progressBar.style.width = percent;
    if (railProgress) railProgress.style.width = percent;
    if (toTop) toTop.classList.toggle("is-visible", window.scrollY > 700);

    if (tocTargets.length) {
      const probe = window.scrollY + window.innerHeight * 0.28;
      let currentId = tocTargets[0].id;

      tocTargets.forEach(function (item) {
        if (item.el.getBoundingClientRect().top + window.scrollY <= probe) {
          currentId = item.id;
        }
      });

      tocLinks.forEach(function (link) {
        const id = decodeURIComponent((link.getAttribute("href") || "").replace(/^#/, ""));
        const active = Boolean(currentId) && id === currentId;
        link.classList.toggle("is-active", active);
        if (active) {
          link.setAttribute("aria-current", "location");
        } else {
          link.removeAttribute("aria-current");
        }
      });
    }

    scrollQueued = false;
  }

  function requestScrollUpdate() {
    if (scrollQueued) return;
    scrollQueued = true;
    window.requestAnimationFrame(updateScrollState);
  }

  window.addEventListener("scroll", requestScrollUpdate, { passive: true });
  window.addEventListener("resize", requestScrollUpdate);
  updateScrollState();

  if (toTop) {
    toTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ------------------------------------------------------------------
     Availability calculator
     ------------------------------------------------------------------ */

  const ninesGroup = $("#ninesGroup");
  const ninesBars = $("#ninesBars");
  const ninesLevels = [
    { label: "99%", annual: 5256 },
    { label: "99.9%", annual: 525.6 },
    { label: "99.99%", annual: 52.56 },
    { label: "99.999%", annual: 5.256 },
    { label: "99.9999%", annual: 0.5256 }
  ];
  let ninesIndex = 2;

  function formatDuration(minutes) {
    const seconds = minutes * 60;
    if (seconds < 60) {
      return seconds.toFixed(1) + " 秒";
    }
    if (minutes < 60) {
      return minutes.toFixed(1) + " 分钟";
    }
    const hours = minutes / 60;
    if (hours < 48) {
      return hours.toFixed(1) + " 小时";
    }
    return (hours / 24).toFixed(1) + " 天";
  }

  function buildNinesChart() {
    if (!ninesBars) return;
    ninesBars.innerHTML = "";
    const maxLog = Math.log10(ninesLevels[0].annual + 1);

    ninesLevels.forEach(function (level, index) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "nines-row";
      row.setAttribute("aria-pressed", "false");

      const label = document.createElement("span");
      label.textContent = level.label;

      const track = document.createElement("span");
      track.className = "bar-track";

      const fill = document.createElement("span");
      fill.className = "bar-fill";
      fill.style.width = (Math.log10(level.annual + 1) / maxLog) * 100 + "%";
      track.appendChild(fill);

      const value = document.createElement("span");
      value.className = "bar-val";
      value.textContent = formatDuration(level.annual) + " / 年";

      row.append(label, track, value);
      row.addEventListener("click", function () {
        selectNines(index);
      });
      ninesBars.appendChild(row);
    });
  }

  function selectNines(index) {
    if (!ninesGroup) return;
    ninesIndex = Math.max(0, Math.min(ninesLevels.length - 1, index));
    const level = ninesLevels[ninesIndex];

    const valueEl = $("#ninesValue");
    const yearEl = $("#ninesYear");
    const monthEl = $("#ninesMonth");
    const weekEl = $("#ninesWeek");

    if (valueEl) valueEl.textContent = level.label;
    if (yearEl) yearEl.textContent = formatDuration(level.annual);
    if (monthEl) monthEl.textContent = formatDuration(level.annual / 12);
    if (weekEl) weekEl.textContent = formatDuration(level.annual / 52);

    $$("button", ninesGroup).forEach(function (button, buttonIndex) {
      const active = buttonIndex === ninesIndex;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    if (ninesBars) {
      $$(".nines-row", ninesBars).forEach(function (row, rowIndex) {
        const active = rowIndex === ninesIndex;
        row.classList.toggle("is-active", active);
        row.setAttribute("aria-pressed", String(active));
      });
    }
  }

  if (ninesGroup) {
    $$("button", ninesGroup).forEach(function (button, index) {
      button.addEventListener("click", function () {
        selectNines(index);
      });
    });
    buildNinesChart();
    selectNines(ninesIndex);
  }

  /* ------------------------------------------------------------------
     Hero failover topology
     ------------------------------------------------------------------ */

  const heroStage = $("#heroStage");
  const heroPackets = $("#heroPackets");
  const heroNodeA = $("#heroNodeA");
  const heroNodeB = $("#heroNodeB");
  const heroFailBtn = $("#heroFail");
  const heroStatus = $("#heroStatus");
  const heroRoleA = $('[data-node-role="A"]');
  const heroRoleB = $('[data-node-role="B"]');
  let heroPhase = "normal";
  let heroTimer = null;

  function heroMeta(node, name, state) {
    if (!node) return;
    const meta = $$(".topo-node-meta span", node);
    if (meta[0]) meta[0].textContent = name;
    if (meta[1]) meta[1].textContent = state;
  }

  function setHeroPhase(phase) {
    heroPhase = phase;
    if (!heroNodeA || !heroNodeB) return;

    heroNodeA.classList.remove("is-primary", "is-standby", "is-down", "is-promoted");
    heroNodeB.classList.remove("is-primary", "is-standby", "is-down", "is-promoted");

    if (phase === "normal") {
      heroNodeA.classList.add("is-primary");
      heroNodeB.classList.add("is-standby");
      if (heroRoleA) heroRoleA.textContent = "主";
      if (heroRoleB) heroRoleB.textContent = "备";
      heroMeta(heroNodeA, "WRITE", "1.2k/s");
      heroMeta(heroNodeB, "REPLICA", "热备");
      if (heroStatus) heroStatus.textContent = "A 正在服务，B 热备中。";
      if (heroFailBtn) {
        heroFailBtn.textContent = "模拟故障";
        heroFailBtn.disabled = false;
      }
    } else if (phase === "failed") {
      heroNodeA.classList.add("is-down");
      heroNodeB.classList.add("is-primary", "is-promoted");
      if (heroRoleA) heroRoleA.textContent = "离线";
      if (heroRoleB) heroRoleB.textContent = "主";
      heroMeta(heroNodeA, "OFFLINE", "0/s");
      heroMeta(heroNodeB, "WRITE", "1.2k/s");
      if (heroStatus) heroStatus.textContent = "A 失联 → B 接管，请求继续，0 丢失。";
      if (heroFailBtn) {
        heroFailBtn.textContent = "切换中…";
        heroFailBtn.disabled = true;
      }
    } else if (phase === "recovered") {
      heroNodeA.classList.add("is-standby");
      heroNodeB.classList.add("is-primary");
      if (heroRoleA) heroRoleA.textContent = "备";
      if (heroRoleB) heroRoleB.textContent = "主";
      heroMeta(heroNodeA, "REPLICA", "热备");
      heroMeta(heroNodeB, "WRITE", "1.2k/s");
      if (heroStatus) heroStatus.textContent = "A 恢复后成为备机，B 继续做主。";
      if (heroFailBtn) {
        heroFailBtn.textContent = "重置演练";
        heroFailBtn.disabled = false;
      }
    }
  }

  function heroSpawnPacket() {
    if (!heroStage || !heroPackets || document.hidden) return;

    const stageRect = heroStage.getBoundingClientRect();
    if (stageRect.bottom < -40 || stageRect.top > window.innerHeight + 40) return;

    const source = $(".ingress-pulse", heroStage);
    const target = heroPhase === "normal" ? heroNodeA : heroNodeB;
    if (!source || !target) return;

    const sourceRect = source.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const startX = sourceRect.left - stageRect.left + sourceRect.width / 2;
    const startY = sourceRect.top - stageRect.top + sourceRect.height / 2;
    const endX = targetRect.left - stageRect.left + 18;
    const endY = targetRect.top - stageRect.top + targetRect.height / 2 + (Math.random() * 16 - 8);

    const packet = document.createElement("span");
    packet.className = "packet";
    packet.style.left = startX - 3 + "px";
    packet.style.top = startY - 3 + "px";
    heroPackets.appendChild(packet);

    window.requestAnimationFrame(function () {
      packet.style.transform = "translate(" + (endX - startX) + "px, " + (endY - startY) + "px)";
    });

    window.setTimeout(function () {
      packet.remove();
    }, 700);
  }

  if (heroStage && !reduceMotion) {
    window.setInterval(heroSpawnPacket, 780);
  }

  if (heroFailBtn) {
    heroFailBtn.addEventListener("click", function () {
      if (heroPhase === "normal") {
        setHeroPhase("failed");
        if (heroTimer) window.clearTimeout(heroTimer);
        heroTimer = window.setTimeout(function () {
          setHeroPhase("recovered");
        }, 4800);
      } else if (heroPhase === "recovered") {
        if (heroTimer) window.clearTimeout(heroTimer);
        setHeroPhase("normal");
      }
    });
  }

  /* ------------------------------------------------------------------
     Failover demo: active-passive / active-active
     ------------------------------------------------------------------ */

  const foDemo = $("#foDemo");
  const foA = $("#foA");
  const foB = $("#foB");
  const foC = $("#foC");
  const foFailBtn = $("#foFail");
  const foResetBtn = $("#foReset");
  const foModeGroup = $("#foMode");
  const foSteps = $("#foSteps");
  const foMulti = $("#foMulti");
  const foStatus = $("#foStatus");
  const foRto = $("#foRto");
  const foDowntime = $("#foDowntime");
  const foWriters = $("#foWriters");
  const foConsistency = $("#foConsistency");
  const foVip = $("#foVip");
  const foVipSmall = foVip ? $("small", foVip) : null;
  const foState = { mode: "active-passive", busy: false };
  let foTimers = [];

  function foStateOf(node) {
    return node ? $(".server-state", node) : null;
  }

  function clearFoTimers() {
    foTimers.forEach(window.clearTimeout);
    foTimers = [];
  }

  function foSchedule(callback, delay) {
    foTimers.push(window.setTimeout(callback, delay));
  }

  function setFoStep(step) {
    $$("#foSteps li").forEach(function (item) {
      const number = Number(item.dataset.step);
      item.classList.toggle("is-active", number === step);
      item.classList.toggle("is-done", number < step);
    });
  }

  function setFoMode(mode) {
    if (!foDemo) return;
    clearFoTimers();
    foState.mode = mode;
    foState.busy = false;
    foDemo.dataset.mode = mode;

    if (foModeGroup) {
      $$("button", foModeGroup).forEach(function (button) {
        const active = button.dataset.mode === mode;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-pressed", String(active));
      });
    }

    [foA, foB, foC].forEach(function (node) {
      if (!node) return;
      node.classList.remove("is-primary", "is-standby", "is-active", "is-down", "is-promoted");
    });

    if (foVip) foVip.classList.remove("is-moved");
    if (foVipSmall) foVipSmall.textContent = "流量入口";
    setFoStep(0);

    if (mode === "active-passive") {
      if (foC) foC.hidden = true;
      if (foA) {
        foA.classList.add("is-primary");
        if (foStateOf(foA)) foStateOf(foA).textContent = "主 · 读写";
      }
      if (foB) {
        foB.classList.add("is-standby");
        if (foStateOf(foB)) foStateOf(foB).textContent = "备 · 只复制";
      }
      if (foSteps) foSteps.hidden = false;
      if (foMulti) foMulti.hidden = true;
      if (foWriters) foWriters.textContent = "1 个";
      if (foDowntime) foDowntime.textContent = "检测 + 判定期间";
      if (foConsistency) foConsistency.textContent = "单写入者，天然简单";
      if (foRto) foRto.textContent = "RTO ≈ 30–60s（示意）";
      if (foStatus) foStatus.textContent = "点击“模拟主节点故障”，观察一次完整切换。";
      if (foFailBtn) {
        foFailBtn.textContent = "模拟主节点故障";
        foFailBtn.disabled = false;
      }
    } else {
      if (foC) foC.hidden = false;
      [foA, foB, foC].forEach(function (node) {
        if (!node) return;
        node.classList.add("is-active");
        const state = foStateOf(node);
        if (state) state.textContent = "运行 · 读写";
      });
      if (foSteps) foSteps.hidden = true;
      if (foMulti) foMulti.hidden = false;
      if (foWriters) foWriters.textContent = "3 个";
      if (foDowntime) foDowntime.textContent = "接近 0";
      if (foConsistency) foConsistency.textContent = "需要冲突解决";
      if (foRto) foRto.textContent = "0 停机，但冲突要解决";
      if (foStatus) foStatus.textContent = "多活模式：单节点故障时流量自动转移；写入冲突需单独处理。";
      if (foFailBtn) {
        foFailBtn.textContent = "模拟一个节点故障";
        foFailBtn.disabled = false;
      }
    }
  }

  if (foModeGroup) {
    $$("button", foModeGroup).forEach(function (button) {
      button.addEventListener("click", function () {
        setFoMode(button.dataset.mode);
      });
    });
  }

  if (foFailBtn) {
    foFailBtn.addEventListener("click", function () {
      if (!foDemo || foState.busy) return;
      foState.busy = true;
      foFailBtn.disabled = true;

      if (foState.mode === "active-passive") {
        if (foStatus) foStatus.textContent = "检测到主节点失联，开始判定……";
        if (foA) {
          foA.classList.remove("is-primary");
          foA.classList.add("is-down");
          if (foStateOf(foA)) foStateOf(foA).textContent = "离线";
        }
        setFoStep(1);

        foSchedule(function () {
          setFoStep(2);
          if (foStatus) foStatus.textContent = "超过半数确认失联，避免误切。";
        }, 900);

        foSchedule(function () {
          setFoStep(3);
          if (foB) {
            foB.classList.remove("is-standby");
            foB.classList.add("is-primary", "is-promoted");
            if (foStateOf(foB)) foStateOf(foB).textContent = "主 · 读写";
          }
          if (foStatus) foStatus.textContent = "B 被提升为新的主节点。";
        }, 1800);

        foSchedule(function () {
          setFoStep(4);
          if (foVip) foVip.classList.add("is-moved");
          if (foVipSmall) foVipSmall.textContent = "→ B";
          if (foStatus) foStatus.textContent = "VIP 漂移，流量入口切到 B。";
        }, 2700);

        foSchedule(function () {
          setFoStep(5);
          if (foDowntime) foDowntime.textContent = "≈ 30–60s（示意）";
          if (foRto) foRto.textContent = "演示：检测 → 判定 → 提升 → 切流";
          if (foStatus) foStatus.textContent = "切换完成：B 接管，客户端恢复访问。";
          foState.busy = false;
        }, 3500);
      } else {
        if (foA) {
          foA.classList.remove("is-active");
          foA.classList.add("is-down");
          if (foStateOf(foA)) foStateOf(foA).textContent = "离线";
        }
        if (foWriters) foWriters.textContent = "2 个";
        if (foConsistency) foConsistency.textContent = "剩余节点继续写";
        if (foStatus) foStatus.textContent = "节点 A 故障，流量自动转移，无请求失败；同一数据的并发写仍需冲突解决。";
        foState.busy = false;
      }
    });
  }

  if (foResetBtn) {
    foResetBtn.addEventListener("click", function () {
      setFoMode(foState.mode);
    });
  }

  if (foDemo) {
    setFoMode("active-passive");
  }

  /* ------------------------------------------------------------------
     Load balancer simulator
     ------------------------------------------------------------------ */

  const lbSim = $("#lbSim");
  const lbStage = $("#lbStage");
  const lbPackets = $("#lbPackets");
  const lbIngress = $("#lbIngress");
  const lbCore = $("#lbCore");
  const lbToggle = $("#lbToggle");
  const lbReset = $("#lbReset");
  const lbNote = $("#lbStrategyNote");
  const lbServedEl = $("#lbServed");
  const lbActiveEl = $("#lbActive");
  const lbFailedEl = $("#lbFailed");
  const lbLog = $("#lbLog");
  const lbStrategyGroup = $("#lbStrategies");

  const lbStrategyNotes = {
    "round-robin": "轮询：按顺序轮流分配，简单均匀，但不关心节点忙闲。",
    weighted: "加权轮询：S1 : S2 : S3 = 3 : 2 : 1。能力强的节点多接，平滑加权会把比例铺开。",
    "least-conn": "最少连接：每次给当前连接数最少的节点。S1 快、S3 慢，这个策略会自动多照顾慢节点。",
    random: "随机：随机挑一台。量大时趋近均匀，短窗口内会抖动。",
    "ip-hash": "IP 哈希：同一来源 IP 固定落到同一节点，用来保 session；节点增减时映射会变。"
  };

  const lbState = {
    strategy: "round-robin",
    running: true,
    gen: 0,
    timer: null,
    rr: 0,
    ipIndex: 0,
    inflight: 0,
    failed: 0,
    ips: ["10.0.0.3", "10.0.0.7", "10.0.0.11", "10.0.0.12", "10.0.0.18", "10.0.0.21"],
    servers: []
  };

  function lbCenter(element) {
    const stageRect = lbStage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    return {
      x: rect.left - stageRect.left + rect.width / 2,
      y: rect.top - stageRect.top + rect.height / 2
    };
  }

  function updateLbServer(server) {
    const card = server.el;
    if (!card) return;
    const active = $("[data-active]", card);
    const served = $("[data-served]", card);
    const load = $("[data-load]", card);
    if (active) active.textContent = server.active;
    if (served) served.textContent = server.served;
    if (load) load.style.width = Math.min(100, (server.active / 6) * 100) + "%";
  }

  function updateLbStats() {
    const totalServed = lbState.servers.reduce(function (sum, server) {
      return sum + server.served;
    }, 0);
    if (lbServedEl) lbServedEl.textContent = totalServed;
    if (lbActiveEl) lbActiveEl.textContent = lbState.inflight;
    if (lbFailedEl) lbFailedEl.textContent = lbState.failed;
  }

  function addLbLog(text, highlight) {
    if (!lbLog) return;
    const item = document.createElement("li");
    if (highlight) {
      const strong = document.createElement("strong");
      strong.textContent = text;
      item.appendChild(strong);
    } else {
      item.textContent = text;
    }
    lbLog.appendChild(item);
    while (lbLog.children.length > 6) {
      lbLog.removeChild(lbLog.firstChild);
    }
  }

  function pickRoundRobin() {
    const count = lbState.servers.length;
    for (let offset = 0; offset < count; offset += 1) {
      const index = (lbState.rr + offset) % count;
      const server = lbState.servers[index];
      if (!server.down) {
        lbState.rr = (index + 1) % count;
        return server;
      }
    }
    return null;
  }

  function pickWeighted() {
    const healthy = lbState.servers.filter(function (server) {
      return !server.down;
    });
    if (!healthy.length) return null;

    let total = 0;
    healthy.forEach(function (server) {
      server.current += server.weight;
      total += server.weight;
    });

    let chosen = healthy[0];
    healthy.forEach(function (server) {
      if (server.current > chosen.current) chosen = server;
    });
    chosen.current -= total;
    return chosen;
  }

  function pickLeastConnections() {
    const healthy = lbState.servers.filter(function (server) {
      return !server.down;
    });
    if (!healthy.length) return null;
    return healthy.reduce(function (best, server) {
      return server.active < best.active ? server : best;
    }, healthy[0]);
  }

  function pickRandom() {
    const healthy = lbState.servers.filter(function (server) {
      return !server.down;
    });
    if (!healthy.length) return null;
    return healthy[Math.floor(Math.random() * healthy.length)];
  }

  function hashIp(ip) {
    let hash = 0;
    for (let index = 0; index < ip.length; index += 1) {
      hash = (hash * 31 + ip.charCodeAt(index)) >>> 0;
    }
    return hash;
  }

  function pickIpHashed(ip) {
    const count = lbState.servers.length;
    const start = hashIp(ip) % count;
    for (let offset = 0; offset < count; offset += 1) {
      const server = lbState.servers[(start + offset) % count];
      if (!server.down) return server;
    }
    return null;
  }

  function pickLbServer(ip) {
    if (lbState.strategy === "weighted") return pickWeighted();
    if (lbState.strategy === "least-conn") return pickLeastConnections();
    if (lbState.strategy === "random") return pickRandom();
    if (lbState.strategy === "ip-hash") return pickIpHashed(ip);
    return pickRoundRobin();
  }

  function failLbRequest() {
    lbState.failed += 1;
    updateLbStats();
  }

  function scheduleLbCompletion(server, generation) {
    const serviceTime = server.speed * (0.82 + Math.random() * 0.36);
    window.setTimeout(function () {
      if (generation !== lbState.gen) return;
      server.active = Math.max(0, server.active - 1);
      lbState.inflight = Math.max(0, lbState.inflight - 1);
      updateLbServer(server);
      updateLbStats();
    }, serviceTime);
  }

  function animateLbPacket(server, ip) {
    if (!lbStage || !lbPackets || !lbIngress || !lbCore) return;

    const start = lbCenter(lbIngress);
    const middle = lbCenter(lbCore);
    const end = lbCenter(server.el);
    const packet = document.createElement("span");
    packet.className = "packet";
    packet.style.left = start.x - 3 + "px";
    packet.style.top = start.y - 3 + "px";
    lbPackets.appendChild(packet);

    const generation = lbState.gen;
    const legOne = reduceMotion ? 10 : 330;
    const legTwo = reduceMotion ? 10 : 430;

    window.requestAnimationFrame(function () {
      packet.style.transform = "translate(" + (middle.x - start.x) + "px, " + (middle.y - start.y) + "px)";
    });

    window.setTimeout(function () {
      if (!packet.isConnected) return;
      packet.style.transition = "transform " + legTwo + "ms linear, opacity 0.2s";
      packet.style.transform =
        "translate(" + (end.x - start.x) + "px, " + (end.y - start.y) + "px)";
    }, legOne + 20);

    window.setTimeout(function () {
      packet.remove();
      if (generation !== lbState.gen) return;

      if (server.down) {
        failLbRequest();
        lbState.inflight = Math.max(0, lbState.inflight - 1);
        updateLbStats();
        addLbLog(ip + " → S" + (server.id + 1) + " 已离线", true);
        return;
      }

      server.active += 1;
      server.served += 1;
      updateLbServer(server);
      updateLbStats();
      scheduleLbCompletion(server, generation);
    }, legOne + legTwo + 40);
  }

  function lbSpawn() {
    if (!lbSim || !lbStage || !lbPackets) return;

    const ip = lbState.ips[lbState.ipIndex % lbState.ips.length];
    lbState.ipIndex += 1;
    const server = pickLbServer(ip);

    if (!server) {
      lbState.inflight += 1;
      failLbRequest();
      window.setTimeout(function () {
        lbState.inflight = Math.max(0, lbState.inflight - 1);
        updateLbStats();
      }, 300);
      addLbLog("没有可用节点 · 请求失败", true);
      return;
    }

    lbState.inflight += 1;
    updateLbStats();
    addLbLog(ip + " → S" + (server.id + 1));
    animateLbPacket(server, ip);
  }

  function lbLoop() {
    if (lbState.running && !document.hidden) {
      const allDown = lbState.servers.every(function (server) {
        return server.down;
      });
      if (allDown) {
        failLbRequest();
        addLbLog("全部节点离线 · 请求失败", true);
      } else if (lbState.inflight < 28) {
        lbSpawn();
      }
    }
    lbState.timer = window.setTimeout(lbLoop, 470);
  }

  function updateLbNote() {
    if (lbNote) lbNote.textContent = lbStrategyNotes[lbState.strategy];
  }

  function resetLbSimulation() {
    lbState.gen += 1;
    lbState.inflight = 0;
    lbState.failed = 0;
    lbState.rr = 0;
    lbState.ipIndex = 0;

    lbState.servers.forEach(function (server) {
      server.active = 0;
      server.served = 0;
      server.down = false;
      server.current = 0;
      if (server.el) {
        server.el.classList.remove("is-down");
        const state = $(".srv-state", server.el);
        const button = $(".srv-kill", server.el);
        if (state) state.textContent = "在线";
        if (button) {
          button.textContent = "下线";
          button.setAttribute("aria-pressed", "false");
        }
      }
      updateLbServer(server);
    });

    if (lbLog) lbLog.innerHTML = "";
    updateLbStats();
  }

  if (lbSim && lbStage) {
    lbState.servers = $$(".srv-card", lbStage).map(function (card, index) {
      return {
        id: index,
        el: card,
        weight: [3, 2, 1][index],
        speed: [900, 1400, 2000][index],
        active: 0,
        served: 0,
        down: false,
        current: 0
      };
    });

    if (lbStrategyGroup) {
      $$("button", lbStrategyGroup).forEach(function (button) {
        button.addEventListener("click", function () {
          lbState.strategy = button.dataset.strategy;
          lbState.rr = 0;
          lbState.servers.forEach(function (server) {
            server.current = 0;
          });
          $$("button", lbStrategyGroup).forEach(function (item) {
            const active = item === button;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-pressed", String(active));
          });
          updateLbNote();
        });
      });
    }

    $$(".srv-kill", lbStage).forEach(function (button) {
      button.addEventListener("click", function () {
        const card = button.closest(".srv-card");
        if (!card) return;
        const server = lbState.servers[Number(card.dataset.server)];
        if (!server) return;

        server.down = !server.down;
        server.current = 0;
        card.classList.toggle("is-down", server.down);
        const state = $(".srv-state", card);
        if (state) state.textContent = server.down ? "离线" : "在线";
        button.textContent = server.down ? "上线" : "下线";
        button.setAttribute("aria-pressed", String(server.down));
        updateLbServer(server);
        updateLbStats();
      });
    });

    if (lbToggle) {
      lbToggle.addEventListener("click", function () {
        lbState.running = !lbState.running;
        lbToggle.textContent = lbState.running ? "暂停" : "继续";
        lbToggle.setAttribute("aria-pressed", String(!lbState.running));
      });
    }

    if (lbReset) {
      lbReset.addEventListener("click", function () {
        resetLbSimulation();
        if (lbToggle) {
          lbState.running = true;
          lbToggle.textContent = "暂停";
          lbToggle.setAttribute("aria-pressed", "false");
        }
      });
    }

    updateLbNote();
    updateLbStats();
    lbLoop();
  }

  /* ------------------------------------------------------------------
     Disaster recovery demo
     ------------------------------------------------------------------ */

  const drDemo = $("#drDemo");
  const drDC1 = $("#drDC1");
  const drDC2 = $("#drDC2");
  const drDC3 = $("#drDC3");
  const drFailBtn = $("#drFail");
  const drResetBtn = $("#drReset");
  const drStatus = $("#drStatus");
  let drFailed = false;

  function drBadge(card) {
    return card ? $(".dc-badge", card) : null;
  }

  function drMeta(card) {
    return card ? $(".dc-meta", card) : null;
  }

  function resetDrDemo() {
    if (!drDC1 || !drDC2) return;
    drFailed = false;

    drDC1.classList.remove("is-failed");
    drDC1.classList.add("is-active");
    drDC2.classList.remove("is-takeover");
    drDC2.classList.add("is-standby");

    const badge1 = drBadge(drDC1);
    const badge2 = drBadge(drDC2);
    if (badge1) badge1.hidden = false;
    if (badge2) badge2.hidden = true;

    if (drMeta(drDC1)) drMeta(drDC1).textContent = "ACTIVE";
    if (drMeta(drDC2)) drMeta(drDC2).textContent = "STANDBY";

    if (drStatus) {
      drStatus.textContent = "同一时间只有 DC 1 对外服务；DC 2 保持环境一致，DC 3 只做数据备份。";
    }
    if (drFailBtn) {
      drFailBtn.disabled = false;
      drFailBtn.textContent = "演练：DC 1 故障";
    }
  }

  if (drFailBtn) {
    drFailBtn.addEventListener("click", function () {
      if (drFailed || !drDC1 || !drDC2) return;
      drFailed = true;

      drDC1.classList.remove("is-active");
      drDC1.classList.add("is-failed");
      drDC2.classList.remove("is-standby");
      drDC2.classList.add("is-takeover");

      const badge1 = drBadge(drDC1);
      const badge2 = drBadge(drDC2);
      if (badge1) badge1.hidden = true;
      if (badge2) badge2.hidden = false;

      if (drMeta(drDC1)) drMeta(drDC1).textContent = "FAILED";
      if (drMeta(drDC2)) drMeta(drDC2).textContent = "ACTIVE";

      if (drStatus) {
        drStatus.textContent = "DC 1 失联，DC 2 接管对外服务。DC 3 仍是异地备份，不参与切换。";
      }
      drFailBtn.disabled = true;
    });
  }

  if (drResetBtn) {
    drResetBtn.addEventListener("click", resetDrDemo);
  }

  if (drDemo) resetDrDemo();

  /* ------------------------------------------------------------------
     Middleware tabs
     ------------------------------------------------------------------ */

  const tabs = $$(".tab");
  const tabPanels = tabs
    .map(function (tab) {
      return document.getElementById(tab.getAttribute("aria-controls"));
    })
    .filter(Boolean);

  function activateTab(tab, focus) {
    tabs.forEach(function (item) {
      const active = item === tab;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-selected", String(active));
      item.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(item.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = !active;
        panel.classList.toggle("is-active", active);
      }
    });
    if (focus) tab.focus();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      activateTab(tab, false);
    });
    tab.addEventListener("keydown", function (event) {
      let next = null;
      if (event.key === "ArrowRight") next = tabs[(index + 1) % tabs.length];
      if (event.key === "ArrowLeft") next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === "Home") next = tabs[0];
      if (event.key === "End") next = tabs[tabs.length - 1];
      if (next) {
        event.preventDefault();
        activateTab(next, true);
      }
    });
  });

  if (tabs.length && tabPanels.length) {
    activateTab(tabs[0], false);
  }

  /* ------------------------------------------------------------------
     Redis sentinel demo
     ------------------------------------------------------------------ */

  const sentinelDemo = $("#sentinelDemo");
  const sentinelNodes = $$(".sentinel-node");
  const sMaster = $("#sMaster");
  const sR1 = $("#sR1");
  const sR2 = $("#sR2");
  const sentinelFailBtn = $("#sentinelFail");
  const sentinelResetBtn = $("#sentinelReset");
  const sentinelStatus = $("#sentinelStatus");
  const sentinelLog = $("#sentinelLog");
  const sentinelState = { gen: 0, timers: [] };

  function sentinelClearTimers() {
    sentinelState.timers.forEach(window.clearTimeout);
    sentinelState.timers = [];
    sentinelState.gen += 1;
  }

  function sentinelSchedule(callback, delay) {
    const generation = sentinelState.gen;
    sentinelState.timers.push(
      window.setTimeout(function () {
        if (generation === sentinelState.gen) callback();
      }, delay)
    );
  }

  function sentinelLogLine(text, tone) {
    if (!sentinelLog) return;
    const item = document.createElement("li");
    if (tone) item.className = tone;
    item.textContent = text;
    sentinelLog.appendChild(item);
    sentinelLog.scrollTop = sentinelLog.scrollHeight;
  }

  function setSentinelTone(node, className, enabled) {
    if (node) node.classList.toggle(className, enabled);
  }

  function resetSentinelDemo() {
    if (!sentinelDemo) return;
    sentinelClearTimers();

    sentinelNodes.forEach(function (node) {
      node.classList.remove("is-voting", "is-agreed");
      const small = $("small", node);
      if (small) small.textContent = "哨兵";
    });

    if (sMaster) {
      sMaster.classList.remove("is-down", "is-promoted");
      sMaster.classList.add("is-master");
      const small = $("small", sMaster);
      if (small) small.textContent = "主 · 读写";
    }
    [sR1, sR2].forEach(function (node) {
      if (!node) return;
      node.classList.remove("is-master", "is-promoted", "is-down");
      node.classList.add("is-replica");
      const small = $("small", node);
      if (small) small.textContent = "从 · 只读";
    });

    if (sentinelLog) {
      sentinelLog.innerHTML = '<li class="log-idle">等待一次故障……</li>';
    }
    if (sentinelStatus) sentinelStatus.textContent = "3 个哨兵监控中";
    if (sentinelFailBtn) sentinelFailBtn.disabled = false;
  }

  if (sentinelFailBtn) {
    sentinelFailBtn.addEventListener("click", function () {
      if (!sentinelDemo || sentinelFailBtn.disabled) return;
      sentinelFailBtn.disabled = true;
      sentinelClearTimers();
      if (sentinelLog) sentinelLog.innerHTML = "";
      if (sentinelStatus) sentinelStatus.textContent = "S1 探测中…";

      sentinelLogLine("S1 ping 主节点超时，标记主观下线", "is-warn");
      sentinelSchedule(function () {
        setSentinelTone(sentinelNodes[0], "is-voting", true);
        sentinelLogLine("S1 通知 S2、S3 复核", "is-warn");
        if (sentinelStatus) sentinelStatus.textContent = "征求其他哨兵意见…";
      }, 100);

      sentinelSchedule(function () {
        sentinelNodes.forEach(function (node) {
          setSentinelTone(node, "is-voting", true);
        });
        if (sMaster) sMaster.classList.add("is-down");
      }, 900);

      sentinelSchedule(function () {
        sentinelNodes.forEach(function (node) {
          setSentinelTone(node, "is-voting", false);
          setSentinelTone(node, "is-agreed", true);
        });
        sentinelLogLine("3/3 哨兵认为主节点不可用 → 客观下线", "is-bad");
        if (sentinelStatus) sentinelStatus.textContent = "客观下线 · 开始选举";
      }, 1700);

      sentinelSchedule(function () {
        sentinelLogLine("S1 当选领头哨兵，主持故障转移", "is-ok");
        if (sentinelStatus) sentinelStatus.textContent = "S1 主持转移";
      }, 2500);

      sentinelSchedule(function () {
        if (sR1) {
          sR1.classList.remove("is-replica");
          sR1.classList.add("is-master", "is-promoted");
          const small = $("small", sR1);
          if (small) small.textContent = "新主 · 读写";
        }
        if (sMaster) {
          sMaster.classList.remove("is-master");
          sMaster.classList.add("is-down");
          const small = $("small", sMaster);
          if (small) small.textContent = "旧主 · 待恢复";
        }
        sentinelLogLine("提升 R1（ID 较小）为新主", "is-ok");
        if (sentinelStatus) sentinelStatus.textContent = "R1 已提升为新主";
      }, 3300);

      sentinelSchedule(function () {
        if (sR2) {
          const small = $("small", sR2);
          if (small) small.textContent = "从 · 指向 R1";
        }
        sentinelLogLine("R2 指向新主；客户端收到新拓扑", "is-ok");
        if (sentinelStatus) sentinelStatus.textContent = "故障转移完成 · R1 为新主";
      }, 4100);

      sentinelSchedule(function () {
        sentinelLogLine("原主恢复后将自动变为从节点", "");
        if (sentinelStatus) sentinelStatus.textContent = "演练完成 · 可重置";
      }, 4800);
    });
  }

  if (sentinelResetBtn) {
    sentinelResetBtn.addEventListener("click", resetSentinelDemo);
  }

  if (sentinelDemo) resetSentinelDemo();

  /* ------------------------------------------------------------------
     Leaky bucket / token bucket simulator
     ------------------------------------------------------------------ */

  const bucketSim = $("#bucketSim");
  if (bucketSim) {
    const capacity = 10;
    const bucketFill = $("#bucketFill");
    const bucketLabel = $("#bucketLabel");
    const bucketHint = $("#bucketHint");
    const bucketModeLabel = $("#bucketModeLabel");
    const bucketAccepted = $("#bucketAccepted");
    const bucketQueued = $("#bucketQueued");
    const bucketRejected = $("#bucketRejected");
    const bucketRate = $("#bucketRate");
    const bucketDrain = $("#bucketDrain");
    const bucketRateLabel = $("#bucketRateLabel");
    const bucketDrainLabel = $("#bucketDrainLabel");
    const bucketBurst = $("#bucketBurst");
    const bucketToggle = $("#bucketToggle");
    const bucketReset = $("#bucketReset");
    const bucketModeGroup = $("#bucketMode");
    const bucketStage = $(".bucket-stage", bucketSim);
    const bucketChips = $("#bucketChips");
    const bucketEl = $("#bucket");

    const bucketState = {
      mode: "leaky",
      running: false,
      rate: 6,
      drain: 3,
      queue: 0,
      tokens: capacity,
      accepted: 0,
      rejected: 0,
      total: 0,
      spawnAcc: 0,
      drainAcc: 0
    };

    function bucketFloatChip(kind, text) {
      if (!bucketStage || !bucketChips || !bucketEl) return;
      const stageRect = bucketStage.getBoundingClientRect();
      const bucketRect = bucketEl.getBoundingClientRect();
      const chip = document.createElement("span");
      chip.className = "bucket-chip " + kind;
      chip.textContent = text;
      chip.style.left =
        bucketRect.left - stageRect.left + bucketRect.width / 2 - 8 + (Math.random() * 28 - 14) + "px";
      chip.style.top = bucketRect.top - stageRect.top + 34 + Math.random() * 36 + "px";
      bucketChips.appendChild(chip);
      window.setTimeout(function () {
        chip.remove();
      }, 900);
    }

    function updateBucketUI() {
      const fillRatio =
        bucketState.mode === "leaky" ? bucketState.queue / capacity : bucketState.tokens / capacity;
      if (bucketFill) bucketFill.style.height = Math.min(100, fillRatio * 100) + "%";
      if (bucketLabel) {
        bucketLabel.textContent =
          bucketState.mode === "leaky"
            ? "队列 " + bucketState.queue + " / " + capacity
            : "令牌 " + Math.floor(bucketState.tokens) + " / " + capacity;
      }
      if (bucketAccepted) bucketAccepted.textContent = bucketState.accepted;
      if (bucketQueued) bucketQueued.textContent = bucketState.mode === "leaky" ? bucketState.queue : 0;
      if (bucketRejected) bucketRejected.textContent = bucketState.rejected;
    }

    function bucketRequest(showChip) {
      bucketState.total += 1;

      if (bucketState.mode === "leaky") {
        if (bucketState.queue < capacity) {
          bucketState.queue += 1;
          if (showChip) bucketFloatChip("ok", "+1");
        } else {
          bucketState.rejected += 1;
          if (showChip) bucketFloatChip("bad", "×");
        }
      } else if (bucketState.tokens >= 1) {
        bucketState.tokens -= 1;
        bucketState.accepted += 1;
        if (showChip) bucketFloatChip("ok", "+1");
      } else {
        bucketState.rejected += 1;
        if (showChip) bucketFloatChip("bad", "×");
      }

      updateBucketUI();
    }

    function bucketTick() {
      const dt = 0.1;

      if (bucketState.running) {
        bucketState.spawnAcc += bucketState.rate * dt;
        while (bucketState.spawnAcc >= 1) {
          bucketState.spawnAcc -= 1;
          bucketRequest(false);
        }
      }

      if (bucketState.mode === "leaky") {
        bucketState.drainAcc += bucketState.drain * dt;
        while (bucketState.drainAcc >= 1) {
          bucketState.drainAcc -= 1;
          if (bucketState.queue > 0) {
            bucketState.queue -= 1;
            bucketState.accepted += 1;
          }
        }
      } else {
        bucketState.drainAcc += bucketState.drain * dt;
        if (bucketState.drainAcc >= 1) {
          const refill = Math.floor(bucketState.drainAcc);
          bucketState.drainAcc -= refill;
          bucketState.tokens = Math.min(capacity, bucketState.tokens + refill);
        }
      }

      updateBucketUI();
    }

    function resetBucketState() {
      bucketState.running = false;
      bucketState.queue = 0;
      bucketState.tokens = capacity;
      bucketState.accepted = 0;
      bucketState.rejected = 0;
      bucketState.total = 0;
      bucketState.spawnAcc = 0;
      bucketState.drainAcc = 0;
      if (bucketToggle) {
        bucketToggle.textContent = "开始持续流量";
        bucketToggle.setAttribute("aria-pressed", "false");
      }
      updateBucketUI();
    }

    function setBucketMode(mode) {
      bucketState.mode = mode;
      if (bucketModeGroup) {
        $$("button", bucketModeGroup).forEach(function (button) {
          const active = button.dataset.mode === mode;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", String(active));
        });
      }
      if (bucketHint) {
        bucketHint.textContent =
          mode === "leaky"
            ? "漏桶算法：请求进入队列排队，桶满后拒绝；下游按固定速率取走请求。突发流量会被削平，代价是排队等待。"
            : "令牌桶算法：令牌按固定速率补充，可累积至桶满；请求取得令牌后立即通过。空闲期积累的令牌可吸收一次突发流量。";
      }
      if (bucketModeLabel) {
        bucketModeLabel.textContent = mode === "leaky" ? "固定速率流出" : "固定速率补充";
      }
      resetBucketState();
    }

    if (bucketModeGroup) {
      $$("button", bucketModeGroup).forEach(function (button) {
        button.addEventListener("click", function () {
          setBucketMode(button.dataset.mode);
        });
      });
    }

    if (bucketBurst) {
      bucketBurst.addEventListener("click", function () {
        for (let index = 0; index < 12; index += 1) {
          bucketRequest(index < 3 || index > 9);
        }
      });
    }

    if (bucketToggle) {
      bucketToggle.addEventListener("click", function () {
        bucketState.running = !bucketState.running;
        bucketToggle.textContent = bucketState.running ? "停止持续流量" : "开始持续流量";
        bucketToggle.setAttribute("aria-pressed", String(bucketState.running));
      });
    }

    if (bucketReset) {
      bucketReset.addEventListener("click", function () {
        resetBucketState();
      });
    }

    if (bucketRate) {
      bucketRate.addEventListener("input", function () {
        bucketState.rate = Number(bucketRate.value);
        if (bucketRateLabel) bucketRateLabel.textContent = bucketState.rate + " /s";
      });
    }

    if (bucketDrain) {
      bucketDrain.addEventListener("input", function () {
        bucketState.drain = Number(bucketDrain.value);
        if (bucketDrainLabel) bucketDrainLabel.textContent = bucketState.drain + " /s";
      });
    }

    setBucketMode("leaky");
    window.setInterval(bucketTick, 100);
  }

  /* ------------------------------------------------------------------
     Quiz
     ------------------------------------------------------------------ */

  const quizCard = $("#quizCard");
  const quizData = [
    {
      question: "99.99% 的可用性，一年大约允许多少停机时间？",
      options: ["约 5 分钟", "约 53 分钟", "约 8.8 小时", "约 31 秒"],
      answer: 1,
      why: "4 个 9 的年度停机约 52.6 分钟，原文按约数写作 53 分钟。"
    },
    {
      question: "主备切换的 RTO，主要卡在哪两步？",
      options: ["备份与恢复", "检测与判定", "建库与建表", "发布与回滚"],
      answer: 1,
      why: "检测故障和判定是否切换需要时间，通常几十秒到几分钟；提升和切流反而很快。"
    },
    {
      question: "主备架构最大的风险是什么？",
      options: ["读性能不足", "存储浪费", "脑裂", "版本不一致"],
      answer: 2,
      why: "网络分区时主备都以为自己该服务，两边各写各的。需要 fencing 保证只有一个主。"
    },
    {
      question: "哪种负载策略可以保持会话（session）？",
      options: ["轮询", "随机", "最小连接数", "IP 哈希"],
      answer: 3,
      why: "同一来源 IP 固定落到同一节点，会话就不会丢。代价是节点增减时映射会变。"
    },
    {
      question: "令牌桶相对漏桶的关键优势是什么？",
      options: ["永远不会拒绝请求", "不需要下游服务", "可以积累令牌、应对突发", "一定更省内存"],
      answer: 2,
      why: "空闲时令牌会攒下来，突发流量可以立即消耗这些令牌；漏桶只能按固定速率放行。"
    },
    {
      question: "Redis 哨兵判定“客观下线”，通常需要什么条件？",
      options: ["任意一个哨兵判断", "主节点自己承认", "超过半数哨兵认为不可用", "所有客户端投票"],
      answer: 2,
      why: "单个哨兵只能标记主观下线；超过半数哨兵都认为不可用，才是客观下线，避免单点误判。"
    },
    {
      question: "MySQL 半同步复制，主库等待什么之后才返回？",
      options: ["所有从库执行完", "主库落盘即可", "客户端确认", "至少一个从库确认接收"],
      answer: 3,
      why: "半同步只等至少一个从库确认接收，兼顾响应速度和一致性；全同步才等待所有从库。"
    },
    {
      question: "五个 99.9% 的环节串联，整体可用性大约是多少？",
      options: ["99.9%", "99.5%", "99.99%", "95%"],
      answer: 1,
      why: "串联链路按乘积计算：0.999⁵ ≈ 0.995，也就是约 99.5%。链路越长，整体越难达到高可用。"
    },
    {
      question: "月度 SLO 为 99.95% 时，大约允许多长时间不可用？",
      options: ["约 4.4 分钟", "约 21.6 分钟", "约 43 分钟", "约 8.8 小时"],
      answer: 1,
      why: "99.95% 的月度错误预算约为 21.6 分钟；99.99% 才约为 4.4 分钟。"
    },
    {
      question: "Kafka 要尽量不丢消息，生产者与主题应如何配合？",
      options: ["acks=0", "acks=1", "acks=all + min.insync.replicas", "关闭 ISR"],
      answer: 2,
      why: "acks=all 等待 ISR 副本确认，min.insync.replicas 保证仍有足够的同步副本；两者配合才可靠。"
    },
    {
      question: "两地三中心的典型运行方式是什么？",
      options: ["三个中心同时写入", "同一时间只有一个中心对外服务", "只做备份，从不切换", "两个中心都只读"],
      answer: 1,
      why: "两地三中心是“单活 + 热备”：同一时间只有一个中心对外服务，另一个保持环境一致，第三个做异地备份。"
    },
    {
      question: "固定窗口限流在窗口边界可能出现什么问题？",
      options: ["请求全部丢失", "瞬时放过接近两倍流量", "令牌永远用不完", "无法统计请求"],
      answer: 1,
      why: "固定窗口在前后两个窗口的交界处可能各放行一次上限流量，形成接近两倍的瞬时突刺；滑动窗口更平滑。"
    }
  ];

  const quizState = { index: 0, score: 0, answered: false };

  if (quizCard) {
    const quizBody = $(".quiz-body", quizCard);
    const quizResult = $("#quizResult");
    const quizQuestion = $("#quizQuestion");
    const quizOptions = $("#quizOptions");
    const quizFeedback = $("#quizFeedback");
    const quizNext = $("#quizNext");
    const quizRestart = $("#quizRestart");
    const quizProgress = $("#quizProgress");
    const quizScore = $("#quizScore");
    const quizVerdict = $("#quizVerdict");
    const letters = ["A", "B", "C", "D"];

    function renderQuizQuestion() {
      const item = quizData[quizState.index];
      quizState.answered = false;

      if (quizProgress) {
        quizProgress.textContent = quizState.index + 1 + " / " + quizData.length;
      }
      if (quizQuestion) quizQuestion.textContent = item.question;
      if (quizFeedback) {
        quizFeedback.textContent = "";
        quizFeedback.className = "quiz-feedback";
      }
      if (quizNext) {
        quizNext.disabled = true;
        quizNext.textContent =
          quizState.index === quizData.length - 1 ? "查看结果" : "下一题";
      }
      if (!quizOptions) return;

      quizOptions.innerHTML = "";
      item.options.forEach(function (option, index) {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "quiz-option";

        const letter = document.createElement("span");
        letter.className = "opt-letter";
        letter.textContent = letters[index];

        const text = document.createElement("span");
        text.textContent = option;

        button.append(letter, text);
        button.addEventListener("click", function () {
          answerQuiz(index);
        });
        quizOptions.appendChild(button);
      });
    }

    function answerQuiz(selected) {
      if (quizState.answered) return;
      quizState.answered = true;
      const item = quizData[quizState.index];
      const buttons = $$(".quiz-option", quizOptions);
      const correct = selected === item.answer;

      buttons.forEach(function (button, index) {
        button.disabled = true;
        if (index === item.answer) button.classList.add("is-correct");
        if (index === selected && !correct) button.classList.add("is-wrong");
        if (index === item.answer && !correct) button.classList.add("is-reveal");
      });

      if (correct) {
        quizState.score += 1;
        if (quizFeedback) {
          quizFeedback.textContent = "对了。" + item.why;
          quizFeedback.className = "quiz-feedback is-ok";
        }
      } else if (quizFeedback) {
        quizFeedback.textContent =
          "差一点，正确答案是 " + letters[item.answer] + "。" + item.why;
        quizFeedback.className = "quiz-feedback is-bad";
      }

      if (quizNext) quizNext.disabled = false;
    }

    function nextQuiz() {
      if (!quizState.answered) return;
      if (quizState.index < quizData.length - 1) {
        quizState.index += 1;
        renderQuizQuestion();
      } else {
        finishQuiz();
      }
    }

    function finishQuiz() {
      if (quizBody) quizBody.hidden = true;
      if (quizResult) quizResult.hidden = false;
      if (quizProgress) quizProgress.textContent = "完成";
      if (quizScore) quizScore.textContent = quizState.score + " / " + quizData.length;

      let verdict = "";
      const total = quizData.length;
      const good = Math.ceil(total * 0.75);
      const basic = Math.ceil(total * 0.5);
      if (quizState.score === total) {
        verdict = "全对。你已经能把概念和取舍串起来了。";
      } else if (quizState.score >= good) {
        verdict = "大部分都对了。回去看看错题对应的图，那里往往藏着关键。";
      } else if (quizState.score >= basic) {
        verdict = "基础有了，但有些地方还没串起来。重点复习第 02、05 章。";
      } else {
        verdict = "先别急着刷题。回去把第 01–03 章的例子走一遍，再回来。";
      }
      if (quizVerdict) quizVerdict.textContent = verdict;
      if (quizRestart) quizRestart.focus();
    }

    function restartQuiz() {
      quizState.index = 0;
      quizState.score = 0;
      quizState.answered = false;
      if (quizBody) quizBody.hidden = false;
      if (quizResult) quizResult.hidden = true;
      renderQuizQuestion();
    }

    if (quizNext) quizNext.addEventListener("click", nextQuiz);
    if (quizRestart) quizRestart.addEventListener("click", restartQuiz);
    renderQuizQuestion();
  }

  /* ------------------------------------------------------------------
     Diagram lightbox
     ------------------------------------------------------------------ */

  const lightbox = $("#lightbox");
  const lightboxStage = $("#lightboxStage");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxZoom = $("#lightboxZoom");
  const lightboxClose = $("#lightboxClose");
  let lightboxReturnFocus = null;

  function setLightboxZoomed(zoomed) {
    if (!lightboxStage) return;
    lightboxStage.classList.toggle("is-zoomed", zoomed);
    if (lightboxZoom) lightboxZoom.textContent = zoomed ? "还原" : "放大";
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    if (lightboxStage) {
      lightboxStage.innerHTML = "";
      lightboxStage.classList.remove("is-zoomed");
    }
    if (lightboxReturnFocus && typeof lightboxReturnFocus.focus === "function") {
      lightboxReturnFocus.focus();
    }
    lightboxReturnFocus = null;
  }

  function openLightbox(svg) {
    if (!lightbox || !lightboxStage) return;
    const clone = svg.cloneNode(true);
    clone.classList.add("lightbox-svg");
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    clone.removeAttribute("tabindex");
    clone.removeAttribute("aria-haspopup");
    clone.setAttribute("aria-hidden", "true");

    const figure = svg.closest("figure");
    const caption = figure ? figure.querySelector("figcaption") : null;
    if (lightboxCaption) {
      lightboxCaption.textContent =
        (caption && caption.textContent.trim()) ||
        svg.getAttribute("aria-label") ||
        "图示";
    }

    lightboxStage.innerHTML = "";
    lightboxStage.appendChild(clone);
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    lightboxReturnFocus = svg;
    setLightboxZoomed(false);
    if (lightboxClose) lightboxClose.focus();
  }

  if (lightbox) {
    $$("svg.dg").forEach(function (svg) {
      const decorative = svg.getAttribute("aria-hidden") === "true" ||
        Boolean(svg.closest('[aria-hidden="true"]'));

      if (!decorative) {
        svg.setAttribute("tabindex", "0");
        svg.setAttribute("aria-haspopup", "dialog");
        if (!svg.getAttribute("title")) {
          svg.setAttribute("title", "点击放大图示");
        }
        svg.addEventListener("keydown", function (event) {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openLightbox(svg);
          }
        });
      }

      svg.addEventListener("click", function () {
        openLightbox(svg);
      });
    });

    if (lightboxClose) {
      lightboxClose.addEventListener("click", closeLightbox);
    }

    if (lightboxZoom) {
      lightboxZoom.addEventListener("click", function () {
        if (!lightboxStage) return;
        setLightboxZoomed(!lightboxStage.classList.contains("is-zoomed"));
      });
    }

    if (lightboxStage) {
      lightboxStage.addEventListener("click", function (event) {
        if (event.target === lightboxStage) return;
        setLightboxZoomed(!lightboxStage.classList.contains("is-zoomed"));
      });
    }

    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) closeLightbox();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeLightbox();
    });
  }

  /* ------------------------------------------------------------------
     Copy buttons and toast
     ------------------------------------------------------------------ */

  const toast = $("#toast");
  let toastTimer = null;

  function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  $$(".copy-btn").forEach(function (button) {
    button.addEventListener("click", function () {
      const target = document.getElementById(button.dataset.copy);
      if (!target) return;
      const text = target.innerText;

      function copied() {
        showToast("已复制");
        const label = $("span", button);
        if (label) {
          const original = label.textContent;
          label.textContent = "已复制";
          window.setTimeout(function () {
            label.textContent = original;
          }, 1400);
        }
      }

      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).then(copied).catch(function () {
          showToast("复制失败，请手动选择");
        });
      } else {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        document.body.appendChild(area);
        area.select();
        try {
          document.execCommand("copy");
          copied();
        } catch (error) {
          showToast("复制失败，请手动选择");
        }
        area.remove();
      }
    });
  });
})();
