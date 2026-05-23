/**
 * Ethiopian Calendar Utility (Backend)
 */

function gregToJDN(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
}

function jdnToEthiopian(jdn) {
  const epoch = 1723856;
  const diff = jdn - epoch;
  const year = Math.floor((4 * diff + 3) / 1461);
  const remaining = diff - Math.floor((1461 * year) / 4);
  const month = Math.floor(remaining / 30) + 1;
  const day = remaining - 30 * (month - 1) + 1;
  return { year: year + 1, month, day };
}

exports.getEthiopianDate = (date = new Date()) => {
  const jdn = gregToJDN(date.getFullYear(), date.getMonth() + 1, date.getDate());
  return jdnToEthiopian(jdn);
};

exports.getEthiopianYear = (date = new Date()) => {
  return exports.getEthiopianDate(date).year;
};

exports.getEthiopianMonth = (date = new Date()) => {
  return exports.getEthiopianDate(date).month;
};

exports.getEthiopianDay = (date = new Date()) => {
  return exports.getEthiopianDate(date).day;
};

exports.getCurrentEthiopianPeriod = () => {
  const now = new Date();
  return {
    year: exports.getEthiopianYear(now),
    month: exports.getEthiopianMonth(now)
  };
};

const ETHIOPIAN_MONTHS_EN = [
  "Meskerem", "Tikimt", "Hidar", "Tahsas", "Tir", "Yekatit",
  "Megabit", "Miazia", "Ginbot", "Sene", "Hamle", "Nehasse", "Pagume"
];

exports.formatEthiopianDate = (date = new Date()) => {
  const eth = exports.getEthiopianDate(date);
  return `${ETHIOPIAN_MONTHS_EN[eth.month - 1]} ${eth.day}, ${eth.year}`;
};
