import type { LabelHTMLAttributes } from "react";

export const SETTING_LABEL_CLASS = "text-[10px] font-bold text-gray-500 uppercase tracking-widest";

export function SettingLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={SETTING_LABEL_CLASS} />;
}
