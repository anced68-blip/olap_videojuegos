// ============================================================
// DASHBOARD SCRIPT - script.js
// ============================================================
"use strict";

// ── Chart instances ──────────────────────────────────────────
let charts = {};
let dtTable = null;

// ── Chart.js global defaults ─────────────────────────────────
Chart.defaults.color          = "#94a3b8";
Chart.defaults.font.family    = "Outfit, sans-serif";
Chart.defaults.font.size      = 12;
Chart.defaults.plugins.legend.labels.boxWidth  = 12;
Chart.defaults.plugins.legend.labels.padding   = 16;
Chart.defaults.plugins.legend.labels.usePointStyle = true;

const PALETTE = [
    "#3b82f6","#8b5cf6","#06b6d4","#f59e0b",
    "#10b981","#ef4444","#f97316","#ec4899",
    "#a3e635","#38bdf8"
];

// ── Init ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
    cargarFiltros();
    cargarDashboard();

    ["filtroYear","filtroGenre","filtroPlatform","filtroPublisher"].forEach(id => {
        document.getElementById(id)?.addEventListener("change", cargarDashboard);
    });

    document.getElementById("btnLimpiarFiltros")?.addEventListener("click", limpiarFiltros);
    document.getElementById("btnActualizar")?.addEventListener("click", cargarDashboard);
});

// ── Filters ──────────────────────────────────────────────────
async function cargarFiltros() {
    try {
        const r    = await fetch("/api/filtros");
        if (!r.ok) throw new Error();
        const data = await r.json();
        llenarSelect("filtroYear",      data.years,      "Todos los años");
        llenarSelect("filtroGenre",     data.genres,     "Todos los géneros");
        llenarSelect("filtroPlatform",  data.platforms,  "Todas las plataformas");
        llenarSelect("filtroPublisher", data.publishers, "Todos los publishers");
    } catch {
        console.error("Error al cargar filtros.");
    }
}

function llenarSelect(id, values, placeholder) {
    const sel = document.getElementById(id);
    if (!sel || !values) return;
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    values.forEach(v => {
        if (v !== null && v !== "") {
            const opt = document.createElement("option");
            opt.value = opt.textContent = v;
            sel.appendChild(opt);
        }
    });
}

function limpiarFiltros() {
    ["filtroYear","filtroGenre","filtroPlatform","filtroPublisher"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    cargarDashboard();
}

function getFiltros() {
    return {
        year:      document.getElementById("filtroYear")?.value      || "",
        genre:     document.getElementById("filtroGenre")?.value     || "",
        platform:  document.getElementById("filtroPlatform")?.value  || "",
        publisher: document.getElementById("filtroPublisher")?.value || "",
    };
}

function buildQuery(filtros) {
    const p = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) p.append(k, v); });
    return p.toString();
}

// ── Dashboard load ────────────────────────────────────────────
async function cargarDashboard() {
    showLoading(true);
    try {
        const q = buildQuery(getFiltros());
        const r = await fetch(`/api/dashboard?${q}`);
        if (!r.ok) throw new Error("Error al cargar datos");
        const data = await r.json();

        actualizarKPIs(data.kpis);
        renderChart("chartAnio",          data.ventas_anio,        chartAnio);
        renderChart("chartGenero",        data.ventas_genero,      chartGenero);
        renderChart("chartPlataforma",    data.ventas_plataforma,  chartPlataforma);
        renderChartRegion("chartRegion",  data.ventas_region);
        renderChart("chartTop",           data.top_videojuegos,    chartTop);
        actualizarTabla(data.tabla);
    } catch (e) {
        console.error(e);
        showError("No se pudo conectar a la base de datos. Verifica la conexión.");
    } finally {
        showLoading(false);
    }
}

// ── KPIs ─────────────────────────────────────────────────────
function actualizarKPIs(kpis) {
    setText("kpiVentas",     formatNum(kpis.total_ventas));
    setText("kpiJuegos",     formatNum(kpis.total_videojuegos));
    setText("kpiAnio",       kpis.anio_mayor_venta    || "—");
    setText("kpiGenero",     kpis.genero_mas_vendido   || "—");
    setText("kpiPlataforma", kpis.plataforma_mas_vendida || "—");
    setText("kpiPublisher",  kpis.publisher_mas_relevante || "—");
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function formatNum(n) {
    return Number(n || 0).toLocaleString("es-BO");
}

// ── Chart helpers ─────────────────────────────────────────────
function destroyChart(key) {
    if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function baseOptions(opts = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 600, easing: "easeInOutQuart" },
        plugins: {
            legend: { display: opts.legend ?? false, position: "bottom" },
            tooltip: {
                backgroundColor: "#111827",
                borderColor:     "rgba(255,255,255,0.08)",
                borderWidth:     1,
                titleColor:      "#f1f5f9",
                bodyColor:       "#94a3b8",
                padding:         12,
            }
        },
        scales: opts.noScales ? {} : {
            x: {
                grid: { color: "rgba(255,255,255,0.04)" },
                ticks: { color: "#4b5563", maxRotation: 45 }
            },
            y: {
                beginAtZero: true,
                grid: { color: "rgba(255,255,255,0.04)" },
                ticks: { color: "#4b5563" }
            }
        }
    };
}

// Generic chart creator
function chartAnio(labels, valores) {
    return {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Ventas globales",
                data: valores,
                tension: 0.4,
                fill: true,
                borderColor: PALETTE[0],
                backgroundColor: "rgba(59,130,246,0.1)",
                pointBackgroundColor: PALETTE[0],
                pointRadius: 4,
                pointHoverRadius: 7,
            }]
        },
        options: baseOptions()
    };
}

function chartGenero(labels, valores) {
    return {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Ventas por género",
                data: valores,
                backgroundColor: PALETTE.map(c => c + "cc"),
                borderColor:     PALETTE,
                borderWidth:     1,
                borderRadius:    6,
            }]
        },
        options: baseOptions()
    };
}

function chartPlataforma(labels, valores) {
    return {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Ventas por plataforma",
                data: valores,
                backgroundColor: PALETTE.map(c => c + "cc"),
                borderColor:     PALETTE,
                borderWidth:     1,
                borderRadius:    6,
            }]
        },
        options: baseOptions()
    };
}

function chartTop(labels, valores) {
    return {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Ventas globales",
                data: valores,
                backgroundColor: PALETTE.map(c => c + "bb"),
                borderColor:     PALETTE,
                borderWidth:     1,
                borderRadius:    6,
            }]
        },
        options: {
            ...baseOptions(),
            indexAxis: "y",
            plugins: {
                ...baseOptions().plugins,
                legend: { display: false }
            },
        }
    };
}

// Dispatch chart creator
function renderChart(canvasId, rawData, creatorFn) {
    const key = canvasId;
    destroyChart(key);
    if (!rawData || rawData.length === 0) return;

    // Infer keys from first object
    const first  = rawData[0];
    const keys   = Object.keys(first);
    const lKey   = keys[0];
    const vKey   = keys[1];
    const labels = rawData.map(r => r[lKey]);
    const valores= rawData.map(r => Number(r[vKey]));

    const config = creatorFn(labels, valores);
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    charts[key] = new Chart(canvas, config);
}

function renderChartRegion(canvasId, data) {
    const key = canvasId;
    destroyChart(key);
    if (!data) return;

    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    charts[key] = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: ["Norteamérica", "Europa", "Japón", "Otros"],
            datasets: [{
                data: [
                    Number(data.na_sales    || 0),
                    Number(data.eu_sales    || 0),
                    Number(data.jp_sales    || 0),
                    Number(data.other_sales || 0),
                ],
                backgroundColor: [PALETTE[0]+"dd", PALETTE[1]+"dd", PALETTE[2]+"dd", PALETTE[3]+"dd"],
                borderColor:     [PALETTE[0], PALETTE[1], PALETTE[2], PALETTE[3]],
                borderWidth:     2,
                hoverOffset:     10,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: "bottom" },
                tooltip: baseOptions().plugins.tooltip,
            },
            cutout: "60%",
        }
    });
}

// ── Table ─────────────────────────────────────────────────────
function actualizarTabla(datos) {
    const tbody = document.querySelector("#tablaVideojuegos tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    (datos || []).forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><strong>${item.name || "—"}</strong></td>
            <td><span class="badge" style="background:rgba(59,130,246,0.12);color:#93c5fd">${item.platform || "—"}</span></td>
            <td>${item.year || "—"}</td>
            <td>${item.genre || "—"}</td>
            <td>${item.publisher || "—"}</td>
            <td><span class="badge badge-sales">${Number(item.global_sales || 0).toLocaleString("es-BO")}</span></td>
        `;
        tbody.appendChild(tr);
    });

    if (dtTable) { dtTable.destroy(); dtTable = null; }

    dtTable = new DataTable("#tablaVideojuegos", {
        pageLength: 10,
        lengthMenu: [10, 25, 50, 100],
        order:      [[5, "desc"]],
        language: {
            search:         "Buscar:",
            lengthMenu:     "Mostrar _MENU_ registros",
            info:           "Mostrando _START_ a _END_ de _TOTAL_ registros",
            infoEmpty:      "No hay registros disponibles",
            infoFiltered:   "(filtrado de _MAX_ registros totales)",
            zeroRecords:    "No se encontraron registros",
            paginate: {
                first:    "«",
                last:     "»",
                next:     "›",
                previous: "‹"
            }
        }
    });
}

// ── UI helpers ────────────────────────────────────────────────
function showLoading(show) {
    const el = document.getElementById("loadingOverlay");
    if (!el) return;
    el.classList.toggle("hidden", !show);
}

function showError(msg) {
    console.error(msg);
    // Could render a toast here
}
