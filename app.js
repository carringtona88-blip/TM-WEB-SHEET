const SPREADSHEET_ID = "1IsClAQPF9GuuSUuE_ZO7SugWLbS14P-zwOvOosz7YCA";

const SHEETS = [
  { name: "Jan - Road To Rumble", gid: "0" },
  { name: "Feb - The Power Of Believing", gid: "254903745" },
  { name: "March - The Steel Horse", gid: "1207810125" },
  { name: "April - Mania", gid: "617845285" },
  { name: "May", gid: "30507220" },
];

const state = {
  rows: [],
  columns: [],
  sheetCache: new Map(),
};

const el = {
  sheetStatus: document.querySelector("#sheetStatus"),
  sheetSelect: document.querySelector("#sheetSelect"),
  eventSelect: document.querySelector("#eventSelect"),
  directionSelect: document.querySelector("#directionSelect"),
  resultLimitSelect: document.querySelector("#resultLimitSelect"),
  searchInput: document.querySelector("#searchInput"),
  scoreFilterSelect: document.querySelector("#scoreFilterSelect"),
  memberCount: document.querySelector("#memberCount"),
  currentMonth: document.querySelector("#currentMonth"),
  finderTitle: document.querySelector("#finderTitle"),
  finderMeta: document.querySelector("#finderMeta"),
  finderList: document.querySelector("#finderList"),
  playerTitle: document.querySelector("#playerTitle"),
  playerMeta: document.querySelector("#playerMeta"),
  playerScores: document.querySelector("#playerScores"),
  rosterMeta: document.querySelector("#rosterMeta"),
  tableHead: document.querySelector("#tableHead"),
  tableBody: document.querySelector("#tableBody"),
};

function csvUrl(gid) {
  return `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${gid}`;
}

function parseCsv(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < csvText.length; i += 1) {
    const char = csvText[i];
    const next = csvText[i + 1];

    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(value);
      if (row.some((cell) => cell.trim() !== "")) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim() !== "")) rows.push(row);
  return rows;
}

function cleanNumber(value) {
  if (value === undefined || value === null || String(value).trim() === "") {
    return null;
  }
  const number = Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : null;
}

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Math.round(value || 0));
}

function normalizeData(csvRows) {
  const rawHeaders = csvRows[0] || [];
  const columns = rawHeaders
    .map((header, index) => ({ label: header.trim(), index }))
    .filter((column) => column.label);

  const rows = csvRows.slice(1).map((raw) => {
    const record = {};
    columns.forEach((column) => {
      record[column.label] = raw[column.index] || "";
    });
    return record;
  });

  return {
    columns,
    rows: rows.filter((row) => row.NAME && row.NAME.trim()),
  };
}

function numericColumns() {
  return state.columns
    .map((column) => column.label)
    .filter((label) => label !== "NAME");
}

function filteredRows() {
  const query = el.searchInput.value.trim().toLowerCase();
  return state.rows.filter((row) => row.NAME.toLowerCase().includes(query));
}

function fieldScores(rows) {
  const field = el.eventSelect.value;
  const scoreFilter = el.scoreFilterSelect.value;

  if (field === "__all__") {
    return [];
  }

  return rows
    .map((row) => ({
      name: row.NAME,
      raw: row[field],
      score: cleanNumber(row[field]),
    }))
    .filter((row) => {
      if (row.score === null) return false;
      if (scoreFilter === "nonzero") return row.score !== 0;
      if (scoreFilter === "below120") return row.score > 0 && row.score < 120000000;
      if (scoreFilter === "below80") return row.score > 0 && row.score < 80000000;
      return true;
    });
}

function renderSheetOptions() {
  el.sheetSelect.innerHTML = SHEETS.map(
    (sheet) => `<option value="${sheet.gid}">${sheet.name}</option>`,
  ).join("");
  el.sheetSelect.value = SHEETS[SHEETS.length - 1].gid;
}

function renderEventOptions(previousValue) {
  const fields = numericColumns();
  el.eventSelect.innerHTML = [
    `<option value="__all__">All Events</option>`,
    ...fields.map((field) => `<option value="${field}">${field}</option>`),
  ]
    .join("");

  if (previousValue === "__all__" || (previousValue && fields.includes(previousValue))) {
    el.eventSelect.value = previousValue;
  } else {
    el.eventSelect.value = "__all__";
  }
}

function renderMetrics(rows) {
  const currentSheet = SHEETS.find((sheet) => sheet.gid === el.sheetSelect.value);

  el.memberCount.textContent = formatNumber(state.rows.length);
  el.currentMonth.textContent = currentSheet ? currentSheet.name.split(" - ")[0] : "-";
  el.rosterMeta.textContent = `${formatNumber(rows.length)} shown`;
}

function renderFinder(rows) {
  const field = el.eventSelect.value;
  const mode = el.directionSelect.value;
  const scoreFilter = el.scoreFilterSelect.value;
  const limit = Number(el.resultLimitSelect.value);
  const titleMode = mode === "lowest" ? "Lowest" : "Highest";
  const hasSearch = el.searchInput.value.trim().length > 0;
  const isMinimumCheck = scoreFilter === "below120" || scoreFilter === "below80";

  if (field === "__all__") {
    el.finderTitle.textContent = "All Events";
    el.finderMeta.textContent = "Player search";
    el.finderList.innerHTML = "";
    return;
  }

  if (!hasSearch && !isMinimumCheck) {
    el.finderTitle.textContent = `${field} Results`;
    el.finderMeta.textContent = "Search first";
    el.finderList.innerHTML = "";
    return;
  }

  const ranked = fieldScores(rows)
    .sort((a, b) =>
      isMinimumCheck || mode === "lowest" ? a.score - b.score : b.score - a.score,
    )
    .slice(0, limit);

  const minimumTitle =
    scoreFilter === "below120"
      ? `Below 120m: ${field}`
      : scoreFilter === "below80"
        ? `Below 80m: ${field}`
        : null;
  el.finderTitle.textContent =
    minimumTitle || `${limit >= 999 ? "All" : `Top ${limit}`} ${titleMode}: ${field}`;
  el.finderMeta.textContent = `${formatNumber(ranked.length)} results`;

  if (!ranked.length) {
    el.finderList.innerHTML = `<div class="empty">No scores found for this field.</div>`;
    return;
  }

  el.finderList.innerHTML = ranked
    .map(
      (row, index) => `
        <article class="rank-card">
          <span class="rank">${index + 1}</span>
          <span class="name" title="${row.name}">${row.name}</span>
          <span class="score">${formatNumber(row.score)}</span>
        </article>
      `,
    )
    .join("");
}

function renderPlayerScores(rows) {
  const query = el.searchInput.value.trim();
  const fields = numericColumns();
  const selectedField = el.eventSelect.value;

  if (!query) {
    el.playerTitle.textContent = "Player Scores";
    el.playerMeta.textContent = "Ready";
    el.playerScores.innerHTML = "";
    return;
  }

  const exactMatch = state.rows.find(
    (row) => row.NAME.toLowerCase() === query.toLowerCase(),
  );
  const player = exactMatch || rows[0];

  if (!player) {
    el.playerTitle.textContent = "Player Scores";
    el.playerMeta.textContent = "No match";
    el.playerScores.innerHTML = `<div class="empty">No member found for "${query}".</div>`;
    return;
  }

  const visibleFields =
    selectedField === "__all__"
      ? fields
      : fields.filter((field) => field === selectedField);

  const scores = visibleFields.map((field) => ({
    field,
    raw: player[field],
    score: cleanNumber(player[field]),
  }));
  const validScores = scores.filter((item) => item.score !== null);
  const highest = validScores.reduce(
    (best, item) => (!best || item.score > best.score ? item : best),
    null,
  );
  const lowest = validScores.reduce(
    (best, item) => (!best || item.score < best.score ? item : best),
    null,
  );

  el.playerTitle.textContent = player.NAME;
  el.playerMeta.textContent =
    selectedField === "__all__"
      ? `${formatNumber(validScores.length)} fields`
      : selectedField;
  el.playerScores.innerHTML = scores
    .map((item) => {
      const isHighest = highest && item.field === highest.field;
      const isLowest = lowest && item.field === lowest.field;
      const badge = isHighest ? "Highest" : isLowest ? "Lowest" : "";
      return `
        <article class="score-card ${isHighest ? "is-high" : ""} ${isLowest ? "is-low" : ""}">
          <span>${item.field}</span>
          <strong>${item.score === null ? "-" : formatNumber(item.score)}</strong>
          ${badge ? `<em>${badge}</em>` : ""}
        </article>
      `;
    })
    .join("");
}

function renderTable(rows) {
  const visibleColumns = state.columns.map((column) => column.label);
  el.tableHead.innerHTML = visibleColumns.map((column) => `<th>${column}</th>`).join("");
  el.tableBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          ${visibleColumns
            .map((column) => {
              const value = row[column] || "";
              const display = column === "NAME" ? value : value || "-";
              return `<td>${display}</td>`;
            })
            .join("")}
        </tr>
      `,
    )
    .join("");
}

function render() {
  const rows = filteredRows();
  renderMetrics(rows);
  renderFinder(rows);
  renderPlayerScores(rows);
  renderTable(rows);
}

async function loadSelectedSheet() {
  const gid = el.sheetSelect.value;
  const sheet = SHEETS.find((item) => item.gid === gid);
  const previousField = el.eventSelect.value;

  try {
    el.sheetStatus.textContent = `Loading ${sheet.name}...`;

    if (!state.sheetCache.has(gid)) {
      const response = await fetch(`${csvUrl(gid)}&cacheBust=${Date.now()}`);
      if (!response.ok) throw new Error(`Sheet returned ${response.status}`);
      const csvText = await response.text();
      state.sheetCache.set(gid, normalizeData(parseCsv(csvText)));
    }

    const data = state.sheetCache.get(gid);
    state.columns = data.columns;
    state.rows = data.rows;
    renderEventOptions(previousField);
    render();
    el.sheetStatus.textContent = "";
  } catch (error) {
    el.sheetStatus.textContent =
      location.protocol === "file:"
        ? "Open with the website link or local preview to load the sheet"
        : "Could not load this sheet tab";
    el.finderList.innerHTML = `<div class="error">${error.message}</div>`;
    el.tableHead.innerHTML = "";
    el.tableBody.innerHTML = "";
  }
}

renderSheetOptions();
el.sheetSelect.addEventListener("change", loadSelectedSheet);
el.eventSelect.addEventListener("change", render);
el.directionSelect.addEventListener("change", render);
el.resultLimitSelect.addEventListener("change", render);
el.searchInput.addEventListener("input", render);
el.scoreFilterSelect.addEventListener("change", render);

loadSelectedSheet();
