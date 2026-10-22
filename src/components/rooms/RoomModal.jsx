"use client";

import { useState, useEffect } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import Alert from "@/components/ui/Alert";
import axios from "@/lib/axios";

export default function RoomModal({
  isOpen,
  onClose,
  onSuccess,
  hostelList = [],
  defaultHostelId = "",
  room = null,
}) {
  const isEditing = !!room;

  const [formData, setFormData] = useState({
    hostelId: defaultHostelId || "",
    roomNumber: "",
    floor: 1,
    capacity: 2,
    roomType: "Non-AC",
    status: "available",
    notes: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (room) {
      setFormData({
        hostelId: room.hostel?._id || room.hostel || defaultHostelId || "",
        roomNumber: room.roomNumber || "",
        floor: room.floor ?? 1,
        capacity: room.capacity ?? 2,
        roomType: room.roomType || "Non-AC",
        status: room.status || "available",
        notes: room.notes || "",
      });
    } else {
      setFormData({
        hostelId: defaultHostelId || (hostelList[0]?._id || ""),
        roomNumber: "",
        floor: 1,
        capacity: 2,
        roomType: "Non-AC",
        status: "available",
        notes: "",
      });
    }
    setError(null);
    setFieldErrors({});
  }, [room, defaultHostelId, hostelList, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client checks
    const errors = {};
    if (!formData.hostelId) errors.hostelId = "Hostel is required";
    if (!formData.roomNumber.trim()) errors.roomNumber = "Room number is required";
    if (formData.floor === "" || Number(formData.floor) < 0) {
      errors.floor = "Floor must be 0 or higher";
    }
    if (Number(formData.capacity) < 1 || Number(formData.capacity) > 6) {
      errors.capacity = "Capacity must be between 1 and 6";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        const payload = {
          roomNumber: formData.roomNumber.trim(),
          floor: Number(formData.floor),
          capacity: Number(formData.capacity),
          roomType: formData.roomType,
          status: formData.status,
          notes: formData.notes.trim(),
        };

        const res = await axios.put(`/api/rooms/${room._id}`, payload);
        onSuccess?.(res.data?.data, "Room updated successfully");
      } else {
        const payload = {
          hostelId: formData.hostelId,
          roomNumber: formData.roomNumber.trim(),
          floor: Number(formData.floor),
          capacity: Number(formData.capacity),
          roomType: formData.roomType,
          notes: formData.notes.trim(),
        };

        const res = await axios.post("/api/rooms", payload);
        onSuccess?.(res.data?.data, "Room created successfully");
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Failed to save room";
      setError(msg);
      if (err.response?.data?.details) {
        setFieldErrors(err.response.data.details);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? `Edit Room ${room?.roomNumber}` : "Add New Room"}
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert type="error" message={error} />}

        {/* Hostel Selector (if not editing and multiple available) */}
        {!isEditing && hostelList.length > 0 && (
          <Select
            label="Hostel"
            name="hostelId"
            value={formData.hostelId}
            onChange={handleChange}
            options={hostelList.map((h) => ({
              value: h._id,
              label: `${h.name} (${h.code})`,
            }))}
            error={fieldErrors.hostelId}
            required
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Room Number"
            name="roomNumber"
            placeholder="e.g. 101"
            value={formData.roomNumber}
            onChange={handleChange}
            error={fieldErrors.roomNumber}
            required
          />

          <Input
            label="Floor"
            name="floor"
            type="number"
            min="0"
            max="20"
            value={formData.floor}
            onChange={handleChange}
            error={fieldErrors.floor}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Bed Capacity"
            name="capacity"
            type="number"
            min="1"
            max="6"
            value={formData.capacity}
            onChange={handleChange}
            error={fieldErrors.capacity}
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

        {isEditing && (
          <Select
            label="Status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            options={[
              { value: "available", label: "Available" },
              { value: "full", label: "Full" },
              { value: "maintenance", label: "Maintenance" },
            ]}
          />
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Notes / Remarks (Admin Only)
          </label>
          <textarea
            name="notes"
            rows={2}
            value={formData.notes}
            onChange={handleChange}
            placeholder="Optional internal remarks..."
            className="w-full rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" size="sm" loading={loading} disabled={loading}>
            {isEditing ? "Save Changes" : "Create Room"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
