import { SOIL_MEASUREMENTS, type ZoneSoil } from "../lib/soilSelection";

type Props = {
  soil: ZoneSoil;
  zoneName: string;
};

/**
 * Shows only values that were actually saved. Anything absent is shown as
 * "not recorded"; nothing is estimated here.
 */
export const ZoneSoilSummary = ({ soil, zoneName }: Props) => {
  if (soil.kind === "none") {
    return (
      <div
        role="status"
        className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
      >
        <p className="font-semibold">No soil test recorded for {zoneName}.</p>
        <p className="mt-1">
          Without soil data no soil-based recommendation can be shown. Any rate
          you enter below is your own input, not a recommendation. Record a
          soil sample for this zone on the Soil Health page.
        </p>
      </div>
    );
  }

  const { sample } = soil;
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
      <p className="font-semibold text-slate-900">
        Soil test values for {zoneName}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        Sample date {sample.samplingDate}. Values are as entered by you; this
        app has not verified them against a laboratory report.
      </p>
      {soil.kind === "field" && (
        <p
          role="status"
          className="mt-2 rounded-lg bg-amber-50 p-2 text-xs text-amber-900"
        >
          No sample was recorded for this specific zone. These are whole-field
          values and may not represent {zoneName}.
        </p>
      )}
      <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-3">
        {SOIL_MEASUREMENTS.map(({ key, label, unit }) => (
          <div key={key}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="font-medium">
              {sample[key] === undefined ? (
                <span className="font-normal text-slate-400">not recorded</span>
              ) : (
                `${sample[key]} ${unit}`.trim()
              )}
            </dd>
          </div>
        ))}
      </dl>
      {sample.recommendations && sample.recommendations.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs font-semibold text-slate-600">
            Recommendations saved with this sample (user-entered, unverified)
          </p>
          <ul className="mt-1 list-disc pl-5 text-xs">
            {sample.recommendations.map((text) => (
              <li key={text}>{text}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-xs text-slate-500">
          No recommendation was saved with this sample. Confirm any fertilizer
          rate with a local agricultural expert.
        </p>
      )}
    </div>
  );
};
