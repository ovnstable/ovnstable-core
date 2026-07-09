import { feasibilityLabels, feasibilityStyles } from "../data/mockData";
import type { Feasibility } from "../types";

const order: Feasibility[] = ["build-now", "engineering-heavy", "partner-enabled", "future-research"];

export function FeasibilityLegend() {
  return (
    <div className="flex flex-wrap gap-2">
      {order.map((item) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${feasibilityStyles[item]}`}
          key={item}
        >
          {feasibilityLabels[item]}
        </span>
      ))}
    </div>
  );
}
