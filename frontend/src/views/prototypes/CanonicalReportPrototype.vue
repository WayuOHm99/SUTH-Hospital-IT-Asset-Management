<script setup>
import { computed, ref } from "vue";
import PrototypeSwitcher from "../../components/prototype/PrototypeSwitcher.vue";

// PROTOTYPE ONLY — three structural variants of the existing /report page,
// switchable with ?variant=A|B|C. All values below are mock data.
const props = defineProps({
  variant: { type: String, required: true },
});

const metric = ref("gross");
const period = ref("กรกฎาคม 2569");
const showAdvanced = ref(false);
const guidedStep = ref(3);

const metricOptions = [
  { key: "gross", label: "ยอดใช้จริง", unit: "หน้า" },
  { key: "billable", label: "ยอดคิดเงิน", unit: "หน้า" },
  { key: "cost", label: "ค่าใช้จ่าย", unit: "บาท" },
];

const activeMetric = computed(() =>
  metricOptions.find((item) => item.key === metric.value) || metricOptions[0]
);

const months = ["พ.ค. 69", "มิ.ย. 69", "ก.ค. 69"];

const devices = [
  { sn: "SUTH-PR-0142", model: "HP M428fdw", place: "รัตนเวช ชั้น 11", unit: "ฝ่าย IT / งานระบบ", room: "ห้อง IT-1102", readings: [8240, 9560, 11320], usage: [1180, 1320, 1760], quality: "complete", price: 1.35 },
  { sn: "SUTH-PR-0208", model: "Canon iR-ADV 4825", place: "OPD ชั้น 2", unit: "ฝ่ายการแพทย์ / อายุรกรรม", room: "จุดคัดกรอง 2", readings: [44120, 45630, 47280], usage: [1410, 1510, 1650], quality: "complete", price: 1.28 },
  { sn: "SUTH-PR-0063", model: "Brother MFC-L8900", place: "ฉุกเฉิน ชั้น 1", unit: "ฝ่ายการแพทย์ / ฉุกเฉิน", room: "Nurse station", readings: [28010, 29390, 30910], usage: [1290, 1380, 1520], quality: "complete", price: 1.42 },
  { sn: "SUTH-PR-0315", model: "HP LaserJet E40040", place: "รัตนเวช ชั้น 8", unit: "ฝ่ายพยาบาล / ICU", room: "เคาน์เตอร์กลาง", readings: [19200, 20130, 21420], usage: [870, 930, 1290], quality: "complete", price: 1.35 },
  { sn: "SUTH-PR-0097", model: "Epson WF-C5790", place: "OPD ชั้น 3", unit: "ฝ่ายการแพทย์ / ศัลยกรรม", room: "ห้อง 3A-12", readings: [12430, null, 13710], usage: [620, null, null], quality: "missing", price: 1.18 },
  { sn: "SUTH-PR-0281", model: "Canon LBP664Cdw", place: "บริหาร ชั้น 4", unit: "ฝ่ายบริหาร / การเงิน", room: "โต๊ะรับเอกสาร", readings: [6200, 6640, 7040], usage: [380, 440, 400], quality: "complete", price: 1.25 },
  { sn: "SUTH-PR-0174", model: "Brother HL-L6400", place: "รัตนเวช ชั้น 6", unit: "ฝ่ายพยาบาล / หอผู้ป่วย 6", room: "เคาน์เตอร์พยาบาล", readings: [3880, 4100, 4290], usage: [240, 220, 190], quality: "complete", price: 1.32 },
  { sn: "SUTH-PR-0402", model: "HP M404dn", place: "OPD ชั้น 1", unit: "ฝ่ายบริหาร / เวชระเบียน", room: "ช่องบริการ 5", readings: [9030, 9180, 9300], usage: [170, 150, 120], quality: "unpriced", price: null },
  { sn: "SUTH-PR-0121", model: "Canon MF445dw", place: "บริหาร ชั้น 2", unit: "ฝ่ายบริหาร / บุคคล", room: "ห้อง HR-204", readings: [2170, 2200, 2200], usage: [45, 30, 0], quality: "complete", price: 1.2 },
  { sn: "SUTH-PR-0366", model: "Epson M3170", place: "รัตนเวช ชั้น 3", unit: "ฝ่ายการแพทย์ / ห้องตรวจ 3", room: "ห้อง 3-08", readings: [1180, 1180, 1180], usage: [0, 0, 0], quality: "complete", price: 1.15 },
];

const totals = {
  gross: 1248620,
  deducted: 249724,
  billable: 998896,
  cost: 1348509.6,
  comparable: 389,
  incomplete: 39,
  totalDevices: 428,
};

const qualityMeta = {
  complete: { label: "ข้อมูลครบ", class: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  missing: { label: "ขาดเลขมิเตอร์", class: "bg-amber-50 text-amber-700 border-amber-200" },
  unpriced: { label: "ยังไม่มีราคา", class: "bg-red-50 text-red-700 border-red-200" },
};

const topDevices = [...devices]
  .filter((item) => item.quality === "complete")
  .sort((a, b) => currentUsage(b) - currentUsage(a))
  .slice(0, 5);
const bottomDevices = [...devices]
  .filter((item) => item.quality === "complete")
  .sort((a, b) => currentUsage(a) - currentUsage(b))
  .slice(0, 5);

function currentUsage(device) {
  return device.usage[device.usage.length - 1] ?? 0;
}

function valueFor(rawUsage, device) {
  if (rawUsage === null || rawUsage === undefined) return null;
  if (metric.value === "billable") return rawUsage * 0.8;
  if (metric.value === "cost") {
    if (!device.price) return null;
    return rawUsage * 0.8 * device.price;
  }
  return rawUsage;
}

function formatMetric(value) {
  if (value === null || value === undefined) return "ไม่สมบูรณ์";
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: metric.value === "cost" ? 2 : 0,
    maximumFractionDigits: metric.value === "gross" ? 0 : metric.value === "billable" ? 1 : 2,
  });
}

function barWidth(device, collection) {
  const maximum = Math.max(...collection.map((item) => currentUsage(item)), 1);
  return `${Math.max(4, (currentUsage(device) / maximum) * 100)}%`;
}

function setMetric(value) {
  metric.value = value;
}
</script>

<template>
  <div class="prototype-surface pb-24" :data-prototype-variant="props.variant">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="rounded-full bg-blue-700 px-3 py-1 text-xs font-semibold text-white">ต้นแบบ UI</span>
        <p class="text-sm text-blue-800">ข้อมูลจำลอง 428 เครื่อง · ไม่มีการเชื่อมต่อฐานข้อมูล</p>
      </div>
      <p class="text-xs font-medium text-blue-700">ปีงบ 2569 · {{ period }} · {{ activeMetric.label }}</p>
    </div>

    <!-- Variant A: summary-first dashboard -->
    <section v-if="props.variant === 'A'" class="space-y-5" aria-label="ต้นแบบแบบสรุปก่อนแล้วเจาะดู">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-sm font-semibold text-blue-600">รายงานหลัก</p>
          <h1 class="mt-1 text-3xl font-bold text-gray-900">เห็นภาพรวมก่อน แล้วค่อยเจาะดูเครื่อง</h1>
          <p class="mt-2 text-sm text-gray-500">ตัวเลขสำคัญ ความครบของข้อมูล และเครื่องที่ใช้มาก–น้อยอยู่ในหน้าเดียว</p>
        </div>
        <button type="button" class="rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white">ส่งออกรายงาน</button>
      </header>

      <div class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div class="grid gap-3 md:grid-cols-4">
          <label class="text-xs font-medium text-gray-500">ช่วงรายงาน
            <select v-model="period" class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800">
              <option>กรกฎาคม 2569</option><option>ย้อนหลัง 3 เดือน</option><option>ย้อนหลัง 6 เดือน</option><option>ทั้งปีงบ 2569</option>
            </select>
          </label>
          <label class="text-xs font-medium text-gray-500">อาคาร
            <select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"><option>ทุกอาคาร</option><option>รัตนเวช</option><option>OPD</option></select>
          </label>
          <label class="text-xs font-medium text-gray-500">ฝ่าย
            <select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800"><option>ทุกฝ่าย</option><option>ฝ่ายการแพทย์</option><option>ฝ่ายพยาบาล</option></select>
          </label>
          <div class="flex items-end"><button type="button" class="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700" @click="showAdvanced = !showAdvanced">{{ showAdvanced ? "ซ่อนตัวกรองเพิ่มเติม" : "ตัวกรองเพิ่มเติม" }}</button></div>
        </div>
        <div v-if="showAdvanced" class="mt-3 grid gap-3 border-t border-gray-100 pt-3 md:grid-cols-3 xl:grid-cols-6">
          <select aria-label="ชั้น" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"><option>ทุกชั้น</option></select>
          <select aria-label="แผนก" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"><option>ทุกแผนก</option></select>
          <select aria-label="ยี่ห้อ" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"><option>ทุกยี่ห้อ</option></select>
          <select aria-label="สัญญา" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"><option>ทุกสัญญา</option></select>
          <select aria-label="สถานะเครื่อง" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"><option>ทุกสถานะเครื่อง</option></select>
          <select aria-label="ความครบของข้อมูล" class="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"><option>ข้อมูลครบและไม่ครบ</option></select>
        </div>
      </div>

      <div class="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <strong>ยอดรวมยังไม่สมบูรณ์:</strong> 39 เครื่องต้องตรวจสอบ — ขาดเลขมิเตอร์ 24, ไม่มีราคา 9, ไม่ทราบหน่วยงาน 6
        <button type="button" class="ml-2 font-semibold underline">ดูรายการ</button>
      </div>

      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <article class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-xs text-gray-500">ยอดใช้จริงก่อนหัก</p><p class="mt-2 text-xl font-bold text-gray-900">1,248,620</p><p class="mt-1 text-xs text-gray-400">หน้า</p></article>
        <article class="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm"><p class="text-xs text-orange-700">หักตามนโยบาย 20%</p><p class="mt-2 text-xl font-bold text-orange-800">249,724.0</p><p class="mt-1 text-xs text-orange-600">หน้า</p></article>
        <article class="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm"><p class="text-xs text-blue-700">ยอดคิดเงิน 80%</p><p class="mt-2 text-xl font-bold text-blue-800">998,896.0</p><p class="mt-1 text-xs text-blue-600">หน้า</p></article>
        <article class="rounded-xl border border-emerald-200 bg-emerald-50 p-4 shadow-sm"><p class="text-xs text-emerald-700">ค่าใช้จ่ายที่คำนวณได้</p><p class="mt-2 text-xl font-bold text-emerald-800">1,348,509.60</p><p class="mt-1 text-xs text-emerald-600">บาท · ยังไม่รวม 9 เครื่อง</p></article>
        <article class="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"><p class="text-xs text-gray-500">เครื่องที่จัดอันดับได้</p><p class="mt-2 text-xl font-bold text-gray-900">389 / 428</p><p class="mt-1 text-xs text-emerald-600">90.9% ข้อมูลพร้อม</p></article>
        <article class="rounded-xl border border-amber-200 bg-white p-4 shadow-sm"><p class="text-xs text-gray-500">ต้องตรวจสอบ</p><p class="mt-2 text-xl font-bold text-amber-700">39</p><p class="mt-1 text-xs text-gray-400">เครื่อง</p></article>
      </div>

      <div class="grid gap-4 xl:grid-cols-2">
        <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between"><div><h2 class="font-semibold text-gray-900">เครื่องที่ใช้มากที่สุด</h2><p class="text-xs text-gray-500">เรียงตามยอดใช้จริงก่อนหัก</p></div><button class="text-sm font-medium text-blue-700">ดู Top 10</button></div>
          <div class="space-y-3"><div v-for="device in topDevices" :key="device.sn"><div class="mb-1 flex justify-between gap-3 text-sm"><span class="truncate font-medium text-gray-700">{{ device.sn }} · {{ device.unit.split('/')[1] }}</span><span class="font-semibold">{{ currentUsage(device).toLocaleString('th-TH') }} หน้า</span></div><div class="h-2 rounded-full bg-gray-100"><div class="h-2 rounded-full bg-blue-600" :style="{ width: barWidth(device, topDevices) }"></div></div></div></div>
        </article>
        <article class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div class="mb-4 flex items-center justify-between"><div><h2 class="font-semibold text-gray-900">เครื่องที่ใช้น้อยที่สุด</h2><p class="text-xs text-gray-500">รวมเครื่องที่มียอดจริงเป็นศูนย์</p></div><button class="text-sm font-medium text-blue-700">ดู Bottom 10</button></div>
          <div class="space-y-3"><div v-for="device in bottomDevices" :key="device.sn"><div class="mb-1 flex justify-between gap-3 text-sm"><span class="truncate font-medium text-gray-700">{{ device.sn }} · {{ device.unit.split('/')[1] }}</span><span class="font-semibold">{{ currentUsage(device).toLocaleString('th-TH') }} หน้า</span></div><div class="h-2 rounded-full bg-gray-100"><div class="h-2 rounded-full bg-emerald-500" :style="{ width: barWidth(device, bottomDevices) }"></div></div></div></div>
        </article>
      </div>

      <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-5 py-4"><div><h2 class="font-semibold text-gray-900">ตารางเครื่องแยกเดือน</h2><p class="text-xs text-gray-500">แสดง 10 จาก 428 เครื่องตามตัวกรอง</p></div><div class="flex rounded-lg border border-gray-200 p-1"><button v-for="option in metricOptions" :key="option.key" type="button" class="rounded-md px-3 py-1.5 text-xs font-medium" :class="metric === option.key ? 'bg-blue-700 text-white' : 'text-gray-600'" @click="setMetric(option.key)">{{ option.label }}</button></div></div>
        <div class="overflow-x-auto"><table class="min-w-[1050px] text-sm"><thead class="bg-gray-50 text-gray-500"><tr><th class="sticky left-0 bg-gray-50 px-4 py-3 text-left">เครื่อง / สถานที่</th><th v-for="month in months" :key="month" class="px-4 py-3 text-right">{{ month }}</th><th class="px-4 py-3 text-center">สถานะข้อมูล</th></tr></thead><tbody class="divide-y divide-gray-100"><tr v-for="device in devices" :key="device.sn" class="hover:bg-gray-50"><td class="sticky left-0 bg-white px-4 py-3"><p class="font-semibold text-gray-900">{{ device.sn }}</p><p class="text-xs text-gray-500">{{ device.place }} · {{ device.room }}</p></td><td v-for="(raw, index) in device.usage" :key="index" class="px-4 py-3 text-right" :class="raw === null ? 'text-amber-700' : 'text-gray-700'">{{ formatMetric(valueFor(raw, device)) }}</td><td class="px-4 py-3 text-center"><span class="whitespace-nowrap rounded-full border px-2 py-1 text-xs" :class="qualityMeta[device.quality].class">{{ qualityMeta[device.quality].label }}</span></td></tr></tbody></table></div>
      </div>
    </section>

    <!-- Variant B: table-first workspace -->
    <section v-else-if="props.variant === 'B'" class="space-y-4" aria-label="ต้นแบบแบบตารางเป็นศูนย์กลาง">
      <header class="rounded-xl bg-gray-900 px-6 py-5 text-white shadow-sm">
        <div class="flex flex-wrap items-center justify-between gap-4"><div><p class="text-xs font-semibold uppercase tracking-[0.16em] text-blue-300">Report workspace</p><h1 class="mt-1 text-2xl font-bold">เริ่มจากเครื่อง แล้วตรวจทุกเดือนได้ทันที</h1><p class="mt-1 text-sm text-gray-300">ตารางเป็นพื้นที่ทำงานหลัก สรุปและอันดับเป็นข้อมูลประกอบ</p></div><div class="flex gap-2"><button class="rounded-lg border border-gray-600 px-3 py-2 text-sm">บันทึกมุมมอง</button><button class="rounded-lg bg-[#ffffff] px-3 py-2 text-sm font-semibold text-[#111827]">ส่งออก</button></div></div>
      </header>

      <div class="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside class="self-start rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
          <div class="flex items-center justify-between"><h2 class="font-semibold text-gray-900">กรองข้อมูล</h2><button class="text-xs font-medium text-blue-700">ล้างทั้งหมด</button></div>
          <div class="mt-4 space-y-4">
            <label class="block text-xs font-medium text-gray-500">ช่วงรายงาน<select v-model="period" class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"><option>กรกฎาคม 2569</option><option>ย้อนหลัง 3 เดือน</option><option>ย้อนหลัง 6 เดือน</option><option>ทั้งปีงบ 2569</option></select></label>
            <label class="block text-xs font-medium text-gray-500">ค้นหาเครื่อง<input class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm" placeholder="SN, รุ่น, ห้อง" /></label>
            <label class="block text-xs font-medium text-gray-500">อาคาร<select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"><option>ทุกอาคาร</option><option>รัตนเวช</option><option>OPD</option></select></label>
            <label class="block text-xs font-medium text-gray-500">ฝ่าย / แผนก<select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"><option>ทุกฝ่ายและแผนก</option><option>ฝ่ายการแพทย์</option><option>ฝ่ายพยาบาล</option></select></label>
            <label class="block text-xs font-medium text-gray-500">ชั้น<select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"><option>ทุกชั้น</option></select></label>
            <label class="block text-xs font-medium text-gray-500">ยี่ห้อ<select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"><option>ทุกยี่ห้อ</option></select></label>
            <label class="block text-xs font-medium text-gray-500">สถานะเครื่อง<select class="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 p-2 text-sm"><option>ทุกสถานะเครื่อง</option></select></label>
            <fieldset class="border-t border-gray-100 pt-4"><legend class="text-xs font-medium text-gray-500">ความครบของข้อมูล</legend><label class="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked /> ข้อมูลครบ 389</label><label class="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked /> ต้องตรวจสอบ 39</label></fieldset>
            <div class="rounded-lg bg-amber-50 p-3 text-xs text-amber-800"><strong>39 เครื่อง</strong> ทำให้ยอดรวมยังไม่สมบูรณ์</div>
          </div>
        </aside>

        <div class="min-w-0 space-y-4">
          <div class="grid grid-cols-2 gap-2 md:grid-cols-4">
            <div class="rounded-lg border border-gray-200 bg-white px-4 py-3"><p class="text-xs text-gray-500">ก่อนหัก</p><p class="mt-1 font-bold text-gray-900">1,248,620 หน้า</p></div>
            <div class="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3"><p class="text-xs text-orange-700">หัก 20%</p><p class="mt-1 font-bold text-orange-800">249,724.0 หน้า</p></div>
            <div class="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3"><p class="text-xs text-blue-700">ยอดคิดเงิน</p><p class="mt-1 font-bold text-blue-800">998,896.0 หน้า</p></div>
            <div class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3"><p class="text-xs text-emerald-700">ค่าใช้จ่ายที่ทราบ</p><p class="mt-1 font-bold text-emerald-800">1,348,509.60 บาท</p></div>
          </div>

          <div class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4"><div><h2 class="font-semibold text-gray-900">428 เครื่อง · 3 เดือน</h2><p class="text-xs text-gray-500">คอลัมน์เครื่องและสถานที่ถูกตรึงไว้ขณะเลื่อน</p></div><div class="flex rounded-lg bg-gray-100 p-1"><button v-for="option in metricOptions" :key="option.key" type="button" class="rounded-md px-3 py-1.5 text-xs font-medium" :class="metric === option.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'" @click="setMetric(option.key)">{{ option.label }}</button></div></div>
            <div class="overflow-auto"><table class="min-w-[1150px] text-sm"><thead class="sticky top-0 bg-gray-100 text-gray-600"><tr><th class="sticky left-0 z-10 min-w-[240px] bg-gray-100 px-4 py-3 text-left">SN / รุ่น</th><th class="min-w-[220px] px-4 py-3 text-left">หน่วยงาน / จุดติดตั้ง</th><th v-for="month in months" :key="month" class="min-w-[130px] px-4 py-3 text-right">{{ month }}</th><th class="px-4 py-3 text-center">คุณภาพข้อมูล</th></tr></thead><tbody class="divide-y divide-gray-100"><tr v-for="device in devices" :key="device.sn" class="hover:bg-blue-50/40"><td class="sticky left-0 bg-white px-4 py-3"><p class="font-semibold text-gray-900">{{ device.sn }}</p><p class="text-xs text-gray-500">{{ device.model }}</p></td><td class="px-4 py-3"><p class="text-gray-700">{{ device.unit }}</p><p class="text-xs text-gray-500">{{ device.place }} · {{ device.room }}</p></td><td v-for="(raw, index) in device.usage" :key="index" class="px-4 py-3 text-right font-medium">{{ formatMetric(valueFor(raw, device)) }}</td><td class="px-4 py-3 text-center"><span class="whitespace-nowrap rounded-full border px-2 py-1 text-xs" :class="qualityMeta[device.quality].class">{{ qualityMeta[device.quality].label }}</span></td></tr></tbody></table></div>
            <div class="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-xs text-gray-500"><span>แสดง 1–10 จาก 428 เครื่อง</span><div class="flex gap-1"><button class="rounded border border-gray-200 px-2 py-1">ก่อนหน้า</button><button class="rounded bg-gray-900 px-2 py-1 text-white">1</button><button class="rounded border border-gray-200 px-2 py-1">2</button><button class="rounded border border-gray-200 px-2 py-1">ถัดไป</button></div></div>
          </div>

          <div class="grid gap-3 md:grid-cols-2"><div class="rounded-xl border border-gray-200 bg-white p-4"><h3 class="font-semibold text-gray-900">ใช้มากที่สุด</h3><p class="mt-2 text-2xl font-bold">SUTH-PR-0142</p><p class="text-sm text-gray-500">1,760 หน้า · ฝ่าย IT</p></div><div class="rounded-xl border border-gray-200 bg-white p-4"><h3 class="font-semibold text-gray-900">ใช้น้อยที่สุดที่ข้อมูลครบ</h3><p class="mt-2 text-2xl font-bold">SUTH-PR-0366</p><p class="text-sm text-gray-500">0 หน้า · ห้องตรวจ 3</p></div></div>
        </div>
      </div>
    </section>

    <!-- Variant C: guided reporting flow -->
    <section v-else class="space-y-5" aria-label="ต้นแบบรายงานแบบนำทางทีละขั้น">
      <header class="mx-auto max-w-5xl text-center"><p class="text-sm font-semibold text-blue-600">สร้างรายงาน</p><h1 class="mt-2 text-3xl font-bold text-gray-900">ตอบ 3 ขั้น แล้วระบบจัดรายงานให้</h1><p class="mt-2 text-sm text-gray-500">เหมาะสำหรับผู้ใช้ที่ไม่ต้องการรู้ว่าตัวกรองแต่ละตัวอยู่ตรงไหน</p></header>

      <nav class="mx-auto grid max-w-4xl grid-cols-3 gap-2" aria-label="ขั้นตอนรายงาน">
        <button v-for="step in [{n:1,label:'เลือกขอบเขต'},{n:2,label:'ตรวจความพร้อม'},{n:3,label:'ดูผลลัพธ์'}]" :key="step.n" type="button" class="rounded-xl border px-3 py-3 text-left" :class="guidedStep === step.n ? 'border-blue-600 bg-blue-50 text-blue-800' : guidedStep > step.n ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 bg-white text-gray-500'" @click="guidedStep = step.n"><span class="mr-2 inline-flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold">{{ step.n }}</span><span class="text-sm font-semibold">{{ step.label }}</span></button>
      </nav>

      <div v-if="guidedStep === 1" class="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 class="text-xl font-bold text-gray-900">ต้องการดูช่วงไหน และหน่วยงานใด</h2><p class="mt-1 text-sm text-gray-500">เลือกเฉพาะสิ่งที่รู้ ที่เหลือใช้ค่า “ทั้งหมด”</p>
        <div class="mt-6 grid gap-4 sm:grid-cols-2"><label class="text-sm font-medium text-gray-700">ช่วงรายงาน<select v-model="period" class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>กรกฎาคม 2569</option><option>ย้อนหลัง 3 เดือน</option><option>ย้อนหลัง 6 เดือน</option><option>ทั้งปีงบ 2569</option></select></label><label class="text-sm font-medium text-gray-700">อาคาร<select class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>ทุกอาคาร</option><option>รัตนเวช</option><option>OPD</option></select></label><label class="text-sm font-medium text-gray-700">ชั้น<select class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>ทุกชั้น</option></select></label><label class="text-sm font-medium text-gray-700">ฝ่าย<select class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>ทุกฝ่าย</option><option>ฝ่ายการแพทย์</option><option>ฝ่ายพยาบาล</option></select></label><label class="text-sm font-medium text-gray-700">แผนก<select class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>ทุกแผนก</option></select></label><label class="text-sm font-medium text-gray-700">ยี่ห้อ<select class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>ทุกยี่ห้อ</option></select></label><label class="text-sm font-medium text-gray-700">สถานะเครื่อง<select class="mt-2 w-full rounded-xl border border-gray-200 bg-gray-50 p-3"><option>ทุกสถานะเครื่อง</option></select></label></div>
        <div class="mt-6 flex justify-end"><button class="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white" @click="guidedStep = 2">ตรวจความพร้อมของข้อมูล</button></div>
      </div>

      <div v-else-if="guidedStep === 2" class="mx-auto max-w-4xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div class="flex flex-wrap items-start justify-between gap-4"><div><h2 class="text-xl font-bold text-gray-900">ข้อมูลพร้อมจัดรายงาน 389 จาก 428 เครื่อง</h2><p class="mt-1 text-sm text-gray-500">ระบบแยกรายการที่ต้องตรวจสอบออกจากเครื่องที่ใช้จัดอันดับ</p></div><span class="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700">พร้อม 90.9%</span></div>
        <div class="mt-5 h-3 overflow-hidden rounded-full bg-gray-100"><div class="h-full w-[90.9%] rounded-full bg-emerald-500"></div></div>
        <div class="mt-6 grid gap-3 sm:grid-cols-3"><button class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-left"><p class="text-2xl font-bold text-amber-800">24</p><p class="text-sm text-amber-700">ขาดเลขมิเตอร์</p><p class="mt-2 text-xs text-amber-600 underline">เปิดรายการ</p></button><button class="rounded-xl border border-red-200 bg-red-50 p-4 text-left"><p class="text-2xl font-bold text-red-800">9</p><p class="text-sm text-red-700">ยังไม่มีราคา</p><p class="mt-2 text-xs text-red-700 underline">เปิดรายการ</p></button><button class="rounded-xl border border-gray-200 bg-gray-50 p-4 text-left"><p class="text-2xl font-bold text-gray-800">6</p><p class="text-sm text-gray-600">ไม่ทราบหน่วยงานเดิม</p><p class="mt-2 text-xs text-gray-600 underline">เปิดรายการ</p></button></div>
        <div class="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800"><strong>ดำเนินการต่อได้:</strong> รายงานจะแสดงยอดที่คำนวณได้พร้อมป้าย “ข้อมูลไม่สมบูรณ์” และจะไม่แทนค่าที่ไม่ทราบด้วยศูนย์</div>
        <div class="mt-6 flex justify-between"><button class="rounded-xl border border-gray-300 px-5 py-3 font-medium" @click="guidedStep = 1">ย้อนกลับ</button><button class="rounded-xl bg-blue-700 px-6 py-3 font-semibold text-white" @click="guidedStep = 3">ดูรายงาน</button></div>
      </div>

      <div v-else class="mx-auto max-w-6xl space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3"><div><p class="text-sm text-gray-500">ทุกอาคาร · ทุกฝ่าย · {{ period }}</p><h2 class="text-2xl font-bold text-gray-900">ผลรายงานที่คำนวณได้</h2></div><div class="flex gap-2"><button class="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium" @click="guidedStep = 1">เปลี่ยนขอบเขต</button><button class="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white">ส่งออก</button></div></div>
        <div class="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><strong>ข้อมูลไม่สมบูรณ์:</strong> ยอดนี้คำนวณจาก 389 เครื่อง มีอีก 39 เครื่องที่แยกไว้ให้ตรวจสอบ</div>
        <div class="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr]"><article class="rounded-2xl bg-gray-900 p-6 text-white"><p class="text-sm text-gray-300">ค่าใช้จ่ายที่คำนวณได้</p><p class="mt-3 text-4xl font-bold">1,348,509.60</p><p class="mt-2 text-sm text-gray-300">บาท · หลังหัก 20% แล้ว</p></article><article class="rounded-2xl border border-orange-200 bg-orange-50 p-5"><p class="text-sm text-orange-700">ยอดใช้จริงก่อนหัก</p><p class="mt-3 text-2xl font-bold text-orange-900">1,248,620</p><p class="mt-1 text-xs text-orange-700">หักออก 249,724.0 หน้า</p></article><article class="rounded-2xl border border-blue-200 bg-blue-50 p-5"><p class="text-sm text-blue-700">ยอดคิดเงิน 80%</p><p class="mt-3 text-2xl font-bold text-blue-900">998,896.0</p><p class="mt-1 text-xs text-blue-700">หน้า</p></article></div>
        <div class="grid gap-4 md:grid-cols-2"><button class="rounded-2xl border border-blue-200 bg-white p-5 text-left shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-blue-600">ใช้มากที่สุด</p><p class="mt-2 text-xl font-bold text-gray-900">SUTH-PR-0142</p><p class="text-sm text-gray-500">ฝ่าย IT · 1,760 หน้า</p><p class="mt-4 text-sm font-semibold text-blue-700">ดู 10 อันดับแรก</p></button><button class="rounded-2xl border border-emerald-200 bg-white p-5 text-left shadow-sm"><p class="text-xs font-semibold uppercase tracking-wide text-emerald-600">ใช้น้อยที่สุดที่ข้อมูลครบ</p><p class="mt-2 text-xl font-bold text-gray-900">SUTH-PR-0366</p><p class="text-sm text-gray-500">ห้องตรวจ 3 · 0 หน้า</p><p class="mt-4 text-sm font-semibold text-emerald-700">ดู 10 อันดับท้าย</p></button></div>
        <div class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"><div class="flex items-center justify-between border-b border-gray-200 px-5 py-4"><div><h3 class="font-semibold text-gray-900">เครื่องที่ควรดูเป็นอันดับแรก</h3><p class="text-xs text-gray-500">เครื่องข้อมูลครบเรียงตามยอดใช้จริง แล้วแยกรายการที่ต้องตรวจสอบ</p></div><button class="text-sm font-semibold text-blue-700">เปิดตาราง 428 เครื่อง</button></div><div class="divide-y divide-gray-100"><div v-for="device in devices.slice(0, 5)" :key="device.sn" class="grid gap-2 px-5 py-3 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><p class="font-semibold text-gray-900">{{ device.sn }} · {{ device.model }}</p><p class="text-xs text-gray-500">{{ device.place }} · {{ device.room }}</p></div><p class="text-sm text-gray-600">{{ device.unit }}</p><div class="text-right"><p class="font-bold text-gray-900">{{ device.quality === 'complete' ? `${currentUsage(device).toLocaleString('th-TH')} หน้า` : 'ไม่สมบูรณ์' }}</p><span class="text-xs" :class="device.quality === 'complete' ? 'text-emerald-600' : 'text-amber-700'">{{ qualityMeta[device.quality].label }}</span></div></div></div></div>
      </div>
    </section>

    <PrototypeSwitcher :current="props.variant" />
  </div>
</template>

<style scoped>
.prototype-surface :deep(.bg-white) {
  background-color: var(--neutral-50);
}

.prototype-surface :deep(.bg-gray-900) {
  background-color: #111827;
}
</style>
