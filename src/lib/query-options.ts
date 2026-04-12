export const POPULATION_FILTER_OPTIONS = [
  { value: "population>=10000", label: "Population >= 10,000" },
  { value: "population>=50000", label: "Population >= 50,000" },
  { value: "population>=100000", label: "Population >= 100,000" },
  { value: "population>=500000", label: "Population >= 500,000" },
  { value: "population>=1000000", label: "Population >= 1,000,000" },
  { value: "__custom__", label: "Custom filter" },
  { value: "", label: "No filter" },
] as const;
