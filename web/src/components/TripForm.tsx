import type { RawFields, TripErrors } from "../types";

/**
 * The structured trip fields shown above the chat: where, when, how many people
 * and budget. Presentational and fully controlled by the parent Planner, which
 * owns the values, validation and the "Start planning" action. Dates are entered
 * as dd/mm/yyyy.
 */
export function TripForm({
  values,
  errors,
  onChange,
}: {
  values: RawFields;
  errors: TripErrors;
  onChange: (field: keyof RawFields, value: string) => void;
}) {
  return (
    <div className="trip-form">
      <div className="field">
        <label htmlFor="where">Where (starting location)</label>
        <input
          id="where"
          type="text"
          value={values.where}
          placeholder="e.g. Kyoto"
          onChange={(e) => onChange("where", e.target.value)}
          aria-invalid={!!errors.where}
        />
        {errors.where && <span className="field-error">{errors.where}</span>}
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="startDate">Start date (dd/mm/yyyy)</label>
          <input
            id="startDate"
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            maxLength={10}
            value={values.startDate}
            onChange={(e) => onChange("startDate", e.target.value)}
            aria-invalid={!!errors.startDate}
          />
          {errors.startDate && <span className="field-error">{errors.startDate}</span>}
        </div>
        <div className="field">
          <label htmlFor="endDate">End date (dd/mm/yyyy)</label>
          <input
            id="endDate"
            type="text"
            inputMode="numeric"
            placeholder="dd/mm/yyyy"
            maxLength={10}
            value={values.endDate}
            onChange={(e) => onChange("endDate", e.target.value)}
            aria-invalid={!!errors.endDate}
          />
          {errors.endDate && <span className="field-error">{errors.endDate}</span>}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor="partySize">People</label>
          <input
            id="partySize"
            type="number"
            min="1"
            step="1"
            value={values.partySize}
            onChange={(e) => onChange("partySize", e.target.value)}
            aria-invalid={!!errors.partySize}
          />
          {errors.partySize && <span className="field-error">{errors.partySize}</span>}
        </div>
        <div className="field">
          <label htmlFor="budget">Budget (USD)</label>
          <input
            id="budget"
            type="number"
            min="1"
            step="any"
            value={values.budget}
            placeholder="e.g. 3000"
            onChange={(e) => onChange("budget", e.target.value)}
            aria-invalid={!!errors.budget}
          />
          {errors.budget && <span className="field-error">{errors.budget}</span>}
        </div>
      </div>
    </div>
  );
}
