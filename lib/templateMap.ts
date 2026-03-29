const CLASSIC_TEMPLATE_ID = "9b6ae83a-02a6-4c47-8816-bade636b412e";

export const TEMPLATE_MAP: Record<string, string> = {
  classic: CLASSIC_TEMPLATE_ID,
  modern: CLASSIC_TEMPLATE_ID, // placeholder — update when second Wix template is created
};

export function getTemplateId(layoutType: string): string {
  return TEMPLATE_MAP[layoutType] || CLASSIC_TEMPLATE_ID;
}
