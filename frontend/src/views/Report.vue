<script setup>
import { computed, ref, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";

import CanonicalReportPrototype from "./prototypes/CanonicalReportPrototype.vue";
import api from "../services/api";
import {
  activeFiscalYear,
  activeFiscalYearRange,
  fiscalYearMonths,
  fiscalYearState,
} from "../stores/fiscalYear";
import { summarizeMonthlyReport } from "../utils/reportSummary";

const rows = ref([]);
const loading = ref(false);
const error = ref("");
const route = useRoute();
let latestRequest = 0;

const prototypeVariant = computed(() => {
  if (!import.meta.env.DEV) return "";
  const value = String(route.query.variant || "").toUpperCase();
  return ["A", "B", "C"].includes(value) ? value : "";
});

const months = computed(() => fiscalYearMonths(activeFiscalYearRange.value));
const report = computed(() => summarizeMonthlyReport(rows.value, months.value));
const hasTransactions = computed(() => rows.value.length > 0);

function formatNumber(value, maximumFractionDigits = 0) {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits });
}

function formatMoney(value) {
  return formatNumber(value, 2);
}

function formatMonth(month) {
  if (!month) return "-";
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthNumber - 1, 1));
}

async function loadReport() {
  if (prototypeVariant.value) return;

  const requestId = ++latestRequest;

  if (!fiscalYearState.activeId || !months.value.length) {
    rows.value = [];
    error.value = "";
    return;
  }

  loading.value = true;
  error.value = "";

  try {
    const response = await api.get("/dashboard/monthly-kpi", {
      params: { month: months.value.join(",") },
    });

    if (requestId === latestRequest) {
      rows.value = Array.isArray(response.data) ? response.data : [];
    }
  } catch (err) {
    if (requestId === latestRequest) {
      console.error("Load report error:", err);
      rows.value = [];
      error.value = "ไม่สามารถโหลดข้อมูลรายงานได้ กรุณาลองใหม่อีกครั้ง";
    }
  } finally {
    if (requestId === latestRequest) loading.value = false;
  }
}

watch(
  [() => fiscalYearState.activeId, prototypeVariant],
  loadReport,
  { immediate: true }
);
</script>

<template>
  <CanonicalReportPrototype
    v-if="prototypeVariant"
    :variant="prototypeVariant"
  />

  <section v-else class="space-y-6">
    <div class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p class="text-sm font-medium text-blue-600">รายงานภาพรวม</p>
        <h1 class="text-2xl font-bold text-gray-900 sm:text-3xl">
          การใช้งานและค่าใช้จ่าย
        </h1>
        <p class="mt-1 text-sm text-gray-500">
          ปีงบประมาณ {{ activeFiscalYear ? Number(activeFiscalYear.year) : "-" }}
        </p>
      </div>

      <button
        type="button"
        class="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="loading || !fiscalYearState.activeId"
        @click="loadReport"
      >
        {{ loading ? "กำลังโหลด..." : "รีเฟรชข้อมูล" }}
      </button>
    </div>

    <div
      v-if="!fiscalYearState.loading && !fiscalYearState.list.length"
      class="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-800"
    >
      ยังไม่มีปีงบประมาณในระบบ กรุณาสร้างปีงบประมาณก่อนดูรายงาน
    </div>

    <div
      v-else-if="error"
      class="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700"
    >
      <p>{{ error }}</p>
      <button type="button" class="mt-3 font-medium underline" @click="loadReport">
        ลองใหม่
      </button>
    </div>

    <template v-else>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">จำนวนหน้าที่บันทึก</p>
          <p class="mt-2 text-2xl font-bold text-gray-900">
            {{ loading ? "…" : formatNumber(report.totals.pagesPrinted) }}
          </p>
          <p class="mt-1 text-xs text-gray-400">หน้าทั้งหมดก่อนคำนวณสุทธิ</p>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">จำนวนหน้าสุทธิ</p>
          <p class="mt-2 text-2xl font-bold text-blue-700">
            {{ loading ? "…" : formatNumber(report.totals.netPages) }}
          </p>
          <p class="mt-1 text-xs text-gray-400">ตามสูตรรายงานของระบบ</p>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">ค่าใช้จ่ายรวม</p>
          <p class="mt-2 text-2xl font-bold text-emerald-700">
            {{ loading ? "…" : formatMoney(report.totals.totalCost) }}
          </p>
          <p class="mt-1 text-xs text-gray-400">บาท</p>
        </article>

        <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-gray-500">เครื่องที่มีข้อมูล</p>
          <p class="mt-2 text-2xl font-bold text-violet-700">
            {{ loading ? "…" : formatNumber(report.totals.activeDevices) }}
          </p>
          <p class="mt-1 text-xs text-gray-400">เครื่องในปีงบที่เลือก</p>
        </article>
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4">
          <div>
            <h2 class="font-semibold text-gray-900">สรุปรายเดือน</h2>
            <p class="text-sm text-gray-500">แสดงครบ 12 เดือนตามช่วงปีงบประมาณ</p>
          </div>
          <span v-if="!loading" class="text-sm text-gray-500">
            {{ hasTransactions ? `${rows.length} รายการ` : "ยังไม่มีรายการ" }}
          </span>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full text-sm">
            <thead class="bg-gray-50 text-left text-gray-500">
              <tr>
                <th class="px-5 py-3 font-medium">เดือน</th>
                <th class="px-5 py-3 text-right font-medium">หน้าที่บันทึก</th>
                <th class="px-5 py-3 text-right font-medium">หน้าสุทธิ</th>
                <th class="px-5 py-3 text-right font-medium">ค่าใช้จ่าย (บาท)</th>
                <th class="px-5 py-3 text-right font-medium">จำนวนเครื่อง</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-if="loading" v-for="index in 6" :key="`loading-${index}`">
                <td v-for="column in 5" :key="column" class="px-5 py-4">
                  <div class="h-4 animate-pulse rounded bg-gray-200"></div>
                </td>
              </tr>
              <tr
                v-else
                v-for="item in report.monthly"
                :key="item.month"
                class="text-gray-700 hover:bg-gray-50"
              >
                <td class="whitespace-nowrap px-5 py-3 font-medium text-gray-900">
                  {{ formatMonth(item.month) }}
                </td>
                <td class="px-5 py-3 text-right">{{ formatNumber(item.pagesPrinted) }}</td>
                <td class="px-5 py-3 text-right">{{ formatNumber(item.netPages) }}</td>
                <td class="px-5 py-3 text-right">{{ formatMoney(item.totalCost) }}</td>
                <td class="px-5 py-3 text-right">{{ formatNumber(item.activeDevices) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="grid gap-3 md:grid-cols-3">
        <RouterLink
          to="/compare"
          class="rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
        >
          เปรียบเทียบรายเดือน →
        </RouterLink>
        <RouterLink
          to="/by-department"
          class="rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
        >
          ดูรายงานตามฝ่ายและแผนก →
        </RouterLink>
        <RouterLink
          to="/expense"
          class="rounded-xl border border-gray-200 bg-white p-4 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
        >
          ดูค่าใช้จ่ายตามสัญญา →
        </RouterLink>
      </div>
    </template>
  </section>
</template>
