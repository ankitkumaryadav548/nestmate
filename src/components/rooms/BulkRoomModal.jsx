"use client";

import { useState, useMemo } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import axios from "@/lib/axios";

export default function BulkRoomModal({
  isOpen,
  onClose,
  onSuccess,
  hostelList = [],
  defaultHostelId = "",
}) {
  const [formData, setFormData] = useState({
    hostelId: defaultHostelId || "",
    floor: 1,
    startNumber: 101,
    count: 10,
    capacity: 2,
    roomType: "Non-AC",
    roomNumberPrefix: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resultSummary, setResultSummary] = useState(null);

  // Live preview computation
  const previewText = useMemo(() => {
    const count = parseInt(formData.count, 10);
    const start = parseInt(formData.startNumber, 10);
    const prefix = formData.roomNumberPrefix || "";

    if (isNaN(count) || count < 1 || isNaN(start)) {
      return "Please enter a valid start number and count.";
    }

    const end = start + count - 1;
    const startFormatted = `${prefix}${start}`;
    const endFormatted = `${prefix}${end}`;

    if (count === 1) {
      return `This will create room ${startFormatted} (1 room).`;
    }
    return `This will create rooms ${startFormatted} to ${endFormatted} (${count} rooms).`;
  }, [formData.startNumber, formData.count, formData.roomNumberPrefix]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setResultSummary(null);

    const countNum = parseInt(formData.count, 10);
    const startNum = parseInt(formData.startNumber, 10);
    const floorNum = parseInt(formData.floor, 10);
    const capNum = parseInt(formData.capacity, 10);
    const selectedHostelId = formData.hostelId || defaultHostelId || hostelList[0]?._id;

    if (!selectedHostelId) {
      setError("Please select a hostel.");
      return;
    }

    if (isNaN(countNum) || countNum < 1 || countNum > 200) {
      setError("Room count must be between 1 and 200.");
      return;
    }

    if (isNaN(startNum) || startNum < 1) {
      setError("Start number must be at least 1.");
      return;
    }

    setLoading(true);

    try {
      const payload = {
        hostelId: selectedHostelId,
        floor: floorNum,
        startNumber: startNum,
        count: countNum,
        capacity: capNum,
        roomType: formData.roomType,
        roomNumberPrefix: formData.roomNumberPrefix.trim(),
      };

      const res = await axios.post("/api/rooms/bulk", payload);
      const summary = res.data?.data;
      setResultSummary(summary);
      onSuccess?.(summary, `Bulk creation: ${summary.created} created, ${summary.skipped} skipped.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to create rooms in bulk";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = () => {
    setResultSummary(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={resultSummary ? handleFinish : onClose}
      title="Add Rooms in Bulk"
      maxWidth="max-w-lg"
    >
      {resultSummary ? (
        <div className="space-y-4 py-2">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-emerald-900">
            <h4 className="font-bold text-sm text-emerald-900 mb-1">
              ✓ Bulk Generation Complete
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs mt-3">
              <div className="bg-white/80 rounded-lg p-2 border border-emerald-200">
                <span className="text-slate-500 block">Rooms Created</span>
                <span className="text-lg font-bold text-emerald-700">{resultSummary.created}</span>
              </div>
              <div className="bg-white/80 rounded-lg p-2 border border-emerald-200">
                <span className="text-slate-500 block">Rooms Skipped</span>
                <span className="text-lg font-bold text-amber-700">{resultSummary.skipped}</span>
              </div>
            </div>
            {resultSummary.skippedNumbers?.length > 0 && (
              <p className="mt-3 text-xs text-amber-800">
                Skipped (already existed): {resultSummary.skippedNumbers.join(", ")}
              </p>
            )}
          </div>
          <div className="flex justify-end pt-2">
            <Button size="sm" onClick={handleFinish}>
              Done
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <Alert type="error" message={error} />}

          {/* Hostel selection */}
          {hostelList.length > 0 && !defaultHostelId && (
            <Select
              label="Hostel"
              name="hostelId"
              value={formData.hostelId || hostelList[0]?._id}
              onChange={handleChange}
              options={hostelList.map((h) => ({
                value: h._id,
                label: `${h.name} (${h.code})`,
              }))}
              required
            />
          )}

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Floor Number"
              name="floor"
              type="number"
              min="0"
              max="20"
              value={formData.floor}
              onChange={handleChange}
              helpText="0 for Ground Floor"
              required
            />

            <Input
              label="Prefix (Optional)"
              name="roomNumberPrefix"
              placeholder="e.g. A- or B"
              value={formData.roomNumberPrefix}
              onChange={handleChange}
              helpText="Appended before room number"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Room Number"
              name="startNumber"
              type="number"
              min="1"
              value={formData.startNumber}
              onChange={handleChange}
              helpText="e.g. 201"
              required
            />

            <Input
              label="Count (Rooms to Create)"
              name="count"
              type="number"
              min="1"
              max="200"
              value={formData.count}
              onChange={handleChange}
              helpText="Max 200 rooms per batch"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Bed Capacity per Room"
              name="capacity"
              type="number"
              min="1"
              max="6"
              value={formData.capacity}
              onChange={handleChange}
              helpText="1 to 6 beds"
              required
            />

            <Select
              label="Room Type"
              name="roomType"
              value={formData.roomType}
              onChange={handleChange}
              options={[
                { value: "Non-AC", label: "Non-AC" },
                { value: "AC", label: "AC" },
              ]}
              required
            />
          </div>

          {/* Live Preview Box */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3.5 text-xs text-indigo-900">
            <span className="font-semibold block mb-0.5">Live Generation Preview:</span>
            <p className="text-indigo-700 font-mono text-xs">{previewText}</p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" loading={loading} disabled={loading}>
              Generate Rooms
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
