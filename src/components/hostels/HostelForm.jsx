"use client";

import { useState, useEffect } from "react";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";

const PRESET_FACILITIES = [
  "Wi-Fi",
  "Laundry",
  "Mess",
  "Gym",
  "Study Room",
  "24x7 Water",
  "Power Backup",
  "CCTV Security",
  "Indoor Games",
  "Hot Water",
];

export default function HostelForm({ initialData = null, onSubmit, loading = false, error = null }) {
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    gender: "boys",
    location: "",
    totalFloors: 4,
    allowedYears: [],
    facilities: [],
    rules: "",
    isActive: true,
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [customFacility, setCustomFacility] = useState("");

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || "",
        code: initialData.code || "",
        gender: initialData.gender || "boys",
        location: initialData.location || "",
        totalFloors: initialData.totalFloors ?? 4,
        allowedYears: initialData.allowedYears || [],
        facilities: initialData.facilities || [],
        rules: initialData.rules || "",
        isActive: initialData.isActive !== undefined ? initialData.isActive : true,
      });
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleYearToggle = (year) => {
    setFormData((prev) => {
      const exists = prev.allowedYears.includes(year);
      const updated = exists
        ? prev.allowedYears.filter((y) => y !== year)
        : [...prev.allowedYears, year].sort((a, b) => a - b);
      return { ...prev, allowedYears: updated };
    });
  };

  const handleFacilityToggle = (facility) => {
    setFormData((prev) => {
      const exists = prev.facilities.includes(facility);
      const updated = exists
        ? prev.facilities.filter((f) => f !== facility)
        : [...prev.facilities, facility];
      return { ...prev, facilities: updated };
    });
  };

  const handleAddCustomFacility = (e) => {
    e.preventDefault();
    const trimmed = customFacility.trim();
    if (trimmed && !formData.facilities.includes(trimmed)) {
      setFormData((prev) => ({
        ...prev,
        facilities: [...prev.facilities, trimmed],
      }));
      setCustomFacility("");
    }
  };

  const handleRemoveFacility = (facility) => {
    setFormData((prev) => ({
      ...prev,
      facilities: prev.facilities.filter((f) => f !== facility),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    // Client validation
    const errors = {};
    if (!formData.name.trim()) errors.name = "Hostel name is required";
    if (!formData.code.trim()) errors.code = "Hostel code is required";
    if (Number(formData.totalFloors) < 1) errors.totalFloors = "Must have at least 1 floor";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    const payload = {
      ...formData,
      name: formData.name.trim(),
      code: formData.code.trim().toUpperCase(),
      totalFloors: Number(formData.totalFloors),
    };

    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <Alert type="error" title="Submission Error" message={error} />}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* Name */}
        <Input
          label="Hostel Name"
          name="name"
          placeholder="e.g. Boys Hostel Block A"
          value={formData.name}
          onChange={handleChange}
          error={fieldErrors.name}
          required
        />

        {/* Code */}
        <Input
          label="Hostel Code"
          name="code"
          placeholder="e.g. BH1 or GHA"
          value={formData.code}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))
          }
          error={fieldErrors.code}
          helpText="Unique short identifier (uppercase)"
          required
        />

        {/* Gender Designation */}
        <Select
          label="Gender Designation"
          name="gender"
          value={formData.gender}
          onChange={handleChange}
          options={[
            { value: "boys", label: "Boys Hostel" },
            { value: "girls", label: "Girls Hostel" },
            { value: "mixed", label: "Mixed / Co-ed" },
          ]}
          required
        />

        {/* Total Floors */}
        <Input
          label="Total Floors"
          name="totalFloors"
          type="number"
          min="1"
          max="20"
          value={formData.totalFloors}
          onChange={handleChange}
          error={fieldErrors.totalFloors}
          helpText="Total number of habitable floors (min 1)"
          required
        />

        {/* Location */}
        <div className="sm:col-span-2">
          <Input
            label="Location / Campus Sector"
            name="location"
            placeholder="e.g. North Campus Sector 2, near Central Library"
            value={formData.location}
            onChange={handleChange}
            helpText="Optional campus address or landmark"
          />
        </div>
      </div>

      {/* Allowed Academic Years */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          Allowed Academic Years
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Select eligible student years. If no years are checked, students from all academic years (1st to 6th) are eligible.
        </p>
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5, 6].map((year) => {
            const isChecked = formData.allowedYears.includes(year);
            return (
              <button
                type="button"
                key={year}
                onClick={() => handleYearToggle(year)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold border transition-all ${
                  isChecked
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                Year {year} {isChecked ? "✓" : "+"}
              </button>
            );
          })}
        </div>
        {formData.allowedYears.length === 0 && (
          <span className="inline-block mt-2 text-[11px] font-medium text-emerald-600">
            ✓ Open to all academic years
          </span>
        )}
      </div>

      {/* Facilities Selection */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          Hostel Facilities & Amenities
        </label>
        <p className="text-xs text-slate-500 mb-3">
          Select available amenities or type a custom facility below.
        </p>

        {/* Preset tags */}
        <div className="flex flex-wrap gap-2 mb-3">
          {PRESET_FACILITIES.map((fac) => {
            const isSelected = formData.facilities.includes(fac);
            return (
              <button
                type="button"
                key={fac}
                onClick={() => handleFacilityToggle(fac)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-all ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {fac} {isSelected ? "✓" : "+"}
              </button>
            );
          })}
        </div>

        {/* Selected Facilities List */}
        {formData.facilities.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {formData.facilities.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 border border-indigo-200"
              >
                {f}
                <button
                  type="button"
                  onClick={() => handleRemoveFacility(f)}
                  className="text-indigo-400 hover:text-indigo-700 ml-0.5"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Add custom tag */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add custom facility (e.g. Solar Geyser)..."
            value={customFacility}
            onChange={(e) => setCustomFacility(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddCustomFacility(e);
              }
            }}
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddCustomFacility}
            className="rounded-lg bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-300"
          >
            Add
          </button>
        </div>
      </div>

      {/* Rules & Guidelines */}
      <div>
        <label className="block text-sm font-semibold text-slate-900 mb-1">
          Hostel Rules & Policies
        </label>
        <textarea
          name="rules"
          rows={3}
          value={formData.rules}
          onChange={handleChange}
          placeholder="e.g. Curfew at 10:30 PM. No loud music after 11 PM. Visitors allowed in lounge only."
          className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
        />
      </div>

      {/* Active Status */}
      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
        <input
          type="checkbox"
          id="isActive"
          name="isActive"
          checked={formData.isActive}
          onChange={handleChange}
          className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
        <label htmlFor="isActive" className="text-sm font-semibold text-slate-900 cursor-pointer">
          Active Status
          <span className="block text-xs font-normal text-slate-500">
            Inactive hostels will not be visible to students for room selection.
          </span>
        </label>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Button
          type="button"
          variant="outline"
          onClick={() => window.history.back()}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={loading} disabled={loading}>
          {initialData ? "Save Changes" : "Create Hostel"}
        </Button>
      </div>
    </form>
  );
}
