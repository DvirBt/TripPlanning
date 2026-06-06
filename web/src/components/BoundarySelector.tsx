import type { Boundary } from "../types";

/**
 * Lets the user define the geographical limit for recommendations. The chosen
 * level + value are sent with every message so the agent (and the server-side
 * geofence) restrict results accordingly.
 */
export function BoundarySelector({
  boundary,
  onChange,
}: {
  boundary: Boundary;
  onChange: (b: Boundary) => void;
}) {
  return (
    <div className="boundary">
      <span className="boundary-label">Stay within</span>
      <select
        value={boundary.level}
        onChange={(e) => onChange({ ...boundary, level: e.target.value as Boundary["level"] })}
      >
        <option value="city">City</option>
        <option value="state">State / Region</option>
        <option value="country">Country</option>
      </select>
      <input
        type="text"
        value={boundary.value}
        placeholder="e.g. Kyoto"
        onChange={(e) => onChange({ ...boundary, value: e.target.value })}
      />
    </div>
  );
}
