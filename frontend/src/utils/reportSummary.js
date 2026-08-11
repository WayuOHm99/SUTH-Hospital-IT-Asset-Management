function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function summarizeMonthlyReport(rows, months) {
  const monthlyMap = new Map(
    months.map((month) => [
      month,
      {
        month,
        pagesPrinted: 0,
        netPages: 0,
        totalCost: 0,
        deviceIds: new Set(),
      },
    ])
  );
  const allDeviceIds = new Set();

  for (const row of rows) {
    if (!monthlyMap.has(row.month)) continue;

    const item = monthlyMap.get(row.month);
    item.pagesPrinted += toNumber(row.pages_printed);
    item.netPages += toNumber(row.net_pages);
    item.totalCost += toNumber(row.total_cost);

    if (row.device_id !== null && row.device_id !== undefined) {
      item.deviceIds.add(row.device_id);
      allDeviceIds.add(row.device_id);
    }
  }

  const monthly = [...monthlyMap.values()].map(({ deviceIds, ...item }) => ({
    ...item,
    activeDevices: deviceIds.size,
  }));

  return {
    monthly,
    totals: {
      pagesPrinted: monthly.reduce((sum, item) => sum + item.pagesPrinted, 0),
      netPages: monthly.reduce((sum, item) => sum + item.netPages, 0),
      totalCost: monthly.reduce((sum, item) => sum + item.totalCost, 0),
      activeDevices: allDeviceIds.size,
    },
  };
}
