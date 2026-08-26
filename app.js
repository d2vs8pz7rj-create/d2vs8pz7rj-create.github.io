const state = {
  items: [],
  filtered: [],
  payload: null,
};

const siteConfig = [
  { key: "bidcenter_blue", source: "采招网", label: "采招网" },
  { key: "szecp", source: "华润守正", label: "华润守正" },
  { key: "365trade", source: "中招联合", label: "中招联合" },
  {
    key: "cebpubservice",
    source: "中国招标投标公共服务平台",
    label: "公共服务平台",
  },
  {
    key: "chinabidding",
    source: "机电产品招标投标电子交易平台",
    label: "机电产品交易平台",
  },
  { key: "ebnew", source: "必联网", label: "必联网" },
];

const healthLabels = {
  ok: "正常",
  partial: "部分成功",
  failed: "失败",
  blocked: "已停止",
  unverified: "未验证",
};

const els = {
  updatedAt: document.querySelector("#updatedAt"),
  totalCount: document.querySelector("#totalCount"),
  sourceStats: [...document.querySelectorAll("[data-source]")],
  siteHealth: document.querySelector("#siteHealth"),
  downloadLink: document.querySelector("#downloadLink"),
  searchInput: document.querySelector("#searchInput"),
  sourceFilter: document.querySelector("#sourceFilter"),
  dateFilter: document.querySelector("#dateFilter"),
  rows: document.querySelector("#bidRows"),
};

function safe(value) {
  return value || "";
}

function escapeHtml(value) {
  return safe(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function fillSelect(select, values, allLabel) {
  select.innerHTML = `<option value="">${allLabel}</option>`;
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function renderStats(payload) {
  const sourceCounts = payload.source_counts || {};
  els.totalCount.textContent = payload.total || 0;
  els.sourceStats.forEach((stat) => {
    const source = stat.dataset.source;
    stat.querySelector("strong").textContent = sourceCounts[source] || 0;
  });
  els.updatedAt.textContent = `数据更新时间：${payload.updated_at || payload.generated_at || "未知"}`;
  els.downloadLink.href = payload.download || "downloads/招标信息总表.xlsx";
}

function renderHealth(payload) {
  const health = payload.site_health || {};
  const sites = health.sites || {};
  const knownKeys = new Set(siteConfig.map((site) => site.key));
  const orderedSites = siteConfig
    .filter((site) => sites[site.key])
    .map((site) => [site.key, site.label, sites[site.key]]);
  Object.entries(sites).forEach(([key, item]) => {
    if (!knownKeys.has(key)) orderedSites.push([key, key, item]);
  });
  const labels = orderedSites.map(([key, label, item]) => {
    const status = item.status || "unverified";
    const marker = healthLabels[status] || status;
    const detail = [key, item.reason].filter(Boolean).join("：");
    return `<span class="health-${escapeHtml(status)}" title="${escapeHtml(detail)}">${escapeHtml(label)}：${escapeHtml(marker)}</span>`;
  });
  els.siteHealth.innerHTML = `<strong>六站采集状态（${escapeHtml(health.date || "未知日期")}）</strong>${labels.join("") || "<span>暂无状态</span>"}`;
}

function renderFilters(items) {
  const sources = [...new Set(items.map((item) => item["来源网站"]).filter(Boolean))].sort();
  const dates = [...new Set(items.map((item) => item["发布时间"]).filter(Boolean))].sort().reverse();
  fillSelect(els.sourceFilter, sources, "全部来源");
  fillSelect(els.dateFilter, dates, "全部日期");
}

function itemText(item) {
  return [
    item["项目名称"],
    item["具体采购内容"],
    item["纳入理由"],
    item["关键信息摘要"],
    item["采购方/招标人"],
    item["来源网站"],
  ]
    .map(safe)
    .join(" ")
    .toLowerCase();
}

function applyFilters() {
  const keyword = els.searchInput.value.trim().toLowerCase();
  const source = els.sourceFilter.value;
  const date = els.dateFilter.value;
  state.filtered = state.items.filter((item) => {
    if (source && item["来源网站"] !== source) return false;
    if (date && item["发布时间"] !== date) return false;
    if (keyword && !itemText(item).includes(keyword)) return false;
    return true;
  });
  renderRows(state.filtered);
}

function renderRows(items) {
  if (!items.length) {
    els.rows.innerHTML = '<tr><td colspan="7" class="empty">没有符合筛选条件的数据</td></tr>';
    return;
  }
  els.rows.innerHTML = items
    .map((item) => {
      const link = safe(item["原文链接"]);
      const linkHtml = link
        ? `<a class="link" href="${escapeHtml(link)}" target="_blank" rel="noreferrer">查看</a>`
        : "";
      return `
        <tr>
          <td>${escapeHtml(item["项目名称"])}</td>
          <td>${escapeHtml(item["具体采购内容"])}</td>
          <td>${escapeHtml(item["采购方/招标人"])}</td>
          <td><span class="source">${escapeHtml(item["来源网站"])}</span></td>
          <td>${escapeHtml(item["发布时间"])}</td>
          <td>${escapeHtml(item["项目状态"])}</td>
          <td>${linkHtml}</td>
        </tr>
      `;
    })
    .join("");
}

async function loadData() {
  try {
    const response = await fetch("data/bids.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    state.payload = payload;
    state.items = payload.items || [];
    renderStats(payload);
    renderHealth(payload);
    renderFilters(state.items);
    applyFilters();
  } catch (error) {
    els.updatedAt.textContent = "数据读取失败";
    els.rows.innerHTML = `<tr><td colspan="7" class="empty">无法读取 data/bids.json：${escapeHtml(error.message)}</td></tr>`;
  }
}

els.searchInput.addEventListener("input", applyFilters);
els.sourceFilter.addEventListener("change", applyFilters);
els.dateFilter.addEventListener("change", applyFilters);

loadData();
