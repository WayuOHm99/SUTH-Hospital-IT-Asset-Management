<script setup>
import { computed, onBeforeUnmount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

const props = defineProps({
  current: { type: String, required: true },
});

const route = useRoute();
const router = useRouter();
const isDev = import.meta.env.DEV;

const variants = [
  { key: "A", name: "สรุปก่อน แล้วเจาะดู" },
  { key: "B", name: "ตารางเป็นศูนย์กลาง" },
  { key: "C", name: "รายงานแบบนำทางทีละขั้น" },
];

const currentIndex = computed(() =>
  Math.max(0, variants.findIndex((item) => item.key === props.current))
);

const currentVariant = computed(() => variants[currentIndex.value]);

function selectVariant(offset) {
  const index = (currentIndex.value + offset + variants.length) % variants.length;
  router.replace({
    query: { ...route.query, variant: variants[index].key },
  });
}

function onKeydown(event) {
  const target = event.target;
  const tagName = target?.tagName?.toLowerCase();
  if (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    target?.isContentEditable
  ) {
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    selectVariant(-1);
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    selectVariant(1);
  }
}

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => window.removeEventListener("keydown", onKeydown));
</script>

<template>
  <div
    v-if="isDev"
    class="fixed bottom-5 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full border border-[#374151] bg-[#111827] px-2 py-2 text-white shadow-2xl"
    aria-label="ตัวเลือกแบบต้นแบบ"
  >
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#374151]"
      aria-label="ดูแบบก่อนหน้า"
      @click="selectVariant(-1)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5" aria-hidden="true">
        <path d="m15 18-6-6 6-6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div class="min-w-[220px] px-3 text-center">
      <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">UI Prototype</p>
      <p class="text-sm font-semibold">{{ currentVariant.key }} — {{ currentVariant.name }}</p>
    </div>

    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#374151]"
      aria-label="ดูแบบถัดไป"
      @click="selectVariant(1)"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" class="h-5 w-5" aria-hidden="true">
        <path d="m9 6 6 6-6 6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>
</template>
