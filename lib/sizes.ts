export interface WixProductOption {
  optionType: string;
  name: string;
  choices: Array<{ value: string; description: string }>;
}

export function buildSizeProductOptions(sizes: string[] | null | undefined): WixProductOption[] {
  if (!sizes || sizes.length === 0) return [];
  return [
    {
      optionType: "drop_down",
      name: "Tamanho",
      choices: sizes.map((value) => ({ value, description: value })),
    },
  ];
}
