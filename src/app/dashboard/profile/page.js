"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import Alert from "@/components/ui/Alert";

const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Delhi (NCT)",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Chandigarh",
  "Other Union Territory",
];

const TIMEZONE_OPTIONS = [
  { value: "Asia/Kolkata", label: "Asia/Kolkata (IST - India, Sri Lanka)" },
  { value: "Africa/Kampala", label: "Africa/Kampala (EAT - Uganda, Kenya, Tanzania)" },
  { value: "Africa/Nairobi", label: "Africa/Nairobi (EAT - Kenya)" },
  { value: "Africa/Lagos", label: "Africa/Lagos (WAT - Nigeria, Ghana)" },
  { value: "Africa/Lusaka", label: "Africa/Lusaka (CAT - Zambia, Zimbabwe)" },
  { value: "Africa/Accra", label: "Africa/Accra (GMT - Ghana)" },
  { value: "Africa/Addis_Ababa", label: "Africa/Addis_Ababa (EAT - Ethiopia)" },
  { value: "Asia/Kathmandu", label: "Asia/Kathmandu (NPT - Nepal)" },
  { value: "Asia/Dhaka", label: "Asia/Dhaka (BST - Bangladesh)" },
  { value: "Asia/Dubai", label: "Asia/Dubai (GST - UAE, Gulf)" },
  { value: "Europe/London", label: "Europe/London (GMT/BST - UK)" },
  { value: "America/New_York", label: "America/New_York (EST/EDT - US East)" },
];

export default function StudentProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [userData, setUserData] = useState(null);
  const [formData, setFormData] = useState({
    course: "",
    department: "",
    year: "",
    phone: "",
    homeState: "",
    homeCountry: "India",
    isInternational: false,
    homeTimeZone: "Asia/Kolkata",
    arrivalDate: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
  });
  const [profileCompletedAt, setProfileCompletedAt] = useState(null);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg("");
      const res = await axios.get("/api/students/me/profile");
      if (res.data?.success) {
        const { user, profile } = res.data.data;
        setUserData(user);
        setFormData({
          course: user?.course || "",
          department: user?.department || "",
          year: user?.year ? String(user.year) : "",
          phone: user?.phone || "",
          homeState: profile?.homeState || "",
          homeCountry: profile?.homeCountry || "India",
          isInternational: Boolean(profile?.isInternational),
          homeTimeZone: profile?.homeTimeZone || "Asia/Kolkata",
          arrivalDate: profile?.arrivalDate
            ? new Date(profile.arrivalDate).toISOString().split("T")[0]
            : "",
          emergencyContactName: profile?.emergencyContactName || "",
          emergencyContactPhone: profile?.emergencyContactPhone || "",
        });
        setProfileCompletedAt(profile?.profileCompletedAt || null);
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setErrorMsg("Failed to load your student profile. Please try refreshing.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    // Clear inline error when typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const updated = { ...prev };
        delete updated[name];
        return updated;
      });
    }
  };

  const handleInternationalToggle = (e) => {
    const isIntl = e.target.checked;
    setFormData((prev) => ({
      ...prev,
      isInternational: isIntl,
      homeCountry: isIntl && prev.homeCountry === "India" ? "" : prev.homeCountry,
      homeTimeZone: isIntl && prev.homeTimeZone === "Asia/Kolkata" ? "Africa/Kampala" : prev.homeTimeZone,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");
    setErrorMsg("");
    setFieldErrors({});

    try {
      const payload = {
        ...formData,
        year: formData.year ? Number(formData.year) : null,
      };

      const res = await axios.put("/api/students/me/profile", payload);
      if (res.data?.success) {
        setSuccessMsg("Your profile details have been saved successfully!");
        setProfileCompletedAt(res.data.data.profile.profileCompletedAt);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Save profile error:", err);
      const data = err.response?.data;
      if (data?.details && typeof data.details === "object") {
        setFieldErrors(data.details);
      }
      setErrorMsg(data?.message || "Failed to save profile. Please check the fields.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 py-12 px-4 max-w-4xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 rounded-lg w-1/3"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2"></div>
        <div className="h-64 bg-slate-100 rounded-2xl"></div>
        <div className="h-64 bg-slate-100 rounded-2xl"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Student Profile
            </h1>
            {profileCompletedAt ? (
              <Badge variant="success" size="sm">
                ✓ Profile Complete
              </Badge>
            ) : (
              <Badge variant="warning" size="sm">
                Action Required
              </Badge>
            )}
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            Keep your academic, regional origin, and emergency contact details updated for accommodation.
          </p>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="mb-6">
          <Alert variant="success" title="Success" onClose={() => setSuccessMsg("")}>
            {successMsg}
          </Alert>
        </div>
      )}
      {errorMsg && (
        <div className="mb-6">
          <Alert variant="danger" title="Error" onClose={() => setErrorMsg("")}>
            {errorMsg}
          </Alert>
        </div>
      )}

      {/* Inclusivity & Privacy Notice */}
      <div className="mb-6 rounded-xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-900 flex items-start gap-3">
        <span className="text-base">🛡️</span>
        <div className="space-y-1">
          <p className="font-semibold text-indigo-950">Ethical Data Standard & Privacy Notice</p>
          <p className="text-indigo-800 leading-relaxed">
            Your home region, nationality, and language fields are strictly confidential. They exist solely to ensure
            appropriate residential support, room comfort, and arrival coordination. Under university policy, demographic
            details are <strong>never</strong> used to penalize, rank, or disadvantage students in any way.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Institutional Identity (Read-only) */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3 flex items-center justify-between">
            <span>Institutional Account</span>
            <span className="text-xs text-slate-400 font-normal">Managed by Registrar</span>
          </h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              value={userData?.name || ""}
              disabled
              helperText="Official university registered name"
            />
            <Input
              label="Registration Number"
              value={userData?.registrationNumber || "N/A"}
              disabled
              helperText="Unique student identifier"
            />
            <Input
              label="Institutional Email"
              value={userData?.email || ""}
              disabled
              helperText="Linked campus email address"
            />
            <Input
              label="Gender"
              value={userData?.gender ? userData.gender.toUpperCase() : "N/A"}
              disabled
              helperText="Determines eligible hostel blocks"
            />
          </div>
        </div>

        {/* Section 2: Academic & Contact Details */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
            Academic & Contact Information
          </h2>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Course / Program"
              name="course"
              value={formData.course}
              onChange={handleChange}
              placeholder="e.g. B.Tech Computer Science"
              required
              error={fieldErrors.course}
              helperText="Your enrolled degree or program"
            />

            <Input
              label="Department / School"
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="e.g. School of Engineering"
              required
              error={fieldErrors.department}
            />

            <Select
              label="Academic Year"
              name="year"
              value={formData.year}
              onChange={handleChange}
              required
              error={fieldErrors.year}
              placeholder="Select year of study"
              options={[
                { value: "1", label: "Year 1 (Freshman / First Year)" },
                { value: "2", label: "Year 2 (Sophomore / Second Year)" },
                { value: "3", label: "Year 3 (Pre-final / Third Year)" },
                { value: "4", label: "Year 4 (Final Year)" },
                { value: "5", label: "Year 5 (Dual Degree / Integrated)" },
                { value: "6", label: "Year 6 (Postgraduate / PhD)" },
              ]}
            />

            <Input
              label="Personal Contact Phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +91 98765 43210"
              required
              error={fieldErrors.phone}
              helperText="Active mobile number for hostel notices"
            />
          </div>
        </div>

        {/* Section 3: Geographic & International Status */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h2 className="text-base font-bold text-slate-900">Geographic Origin & Arrival</h2>
              <p className="text-xs text-slate-500">Helps campus services manage arrival logistics and time zones.</p>
            </div>

            {/* International Student Toggle */}
            <label className="inline-flex items-center gap-2 cursor-pointer select-none rounded-xl bg-slate-50 border border-slate-200 px-3 py-1.5 hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                name="isInternational"
                checked={formData.isInternational}
                onChange={handleInternationalToggle}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-semibold text-slate-700">International Student</span>
            </label>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Home Country"
              name="homeCountry"
              value={formData.homeCountry}
              onChange={handleChange}
              placeholder={formData.isInternational ? "e.g. Uganda, Kenya, Nepal" : "India"}
              required
              error={fieldErrors.homeCountry}
            />

            {formData.isInternational ? (
              <Input
                label="Home State / Province"
                name="homeState"
                value={formData.homeState}
                onChange={handleChange}
                placeholder="e.g. Central Region, Kampala"
                error={fieldErrors.homeState}
                helperText="Optional for international students"
              />
            ) : (
              <Select
                label="Home State / UT"
                name="homeState"
                value={formData.homeState}
                onChange={handleChange}
                required
                error={fieldErrors.homeState}
                placeholder="Select Indian State / Union Territory"
                options={INDIAN_STATES.map((st) => ({ value: st, label: st }))}
              />
            )}

            {formData.isInternational && (
              <>
                <Select
                  label="Home Time Zone"
                  name="homeTimeZone"
                  value={formData.homeTimeZone}
                  onChange={handleChange}
                  options={TIMEZONE_OPTIONS}
                  helperText="Enables accurate roommate scheduling for late calls"
                />

                <Input
                  label="Expected Campus Arrival Date"
                  name="arrivalDate"
                  type="date"
                  value={formData.arrivalDate}
                  onChange={handleChange}
                  error={fieldErrors.arrivalDate}
                  helperText="Date you plan to check into the hostel"
                />
              </>
            )}
          </div>
        </div>

        {/* Section 4: Emergency Contact */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900">Emergency Contact</h2>
            <p className="text-xs text-slate-500">Parent, guardian, or local contact in case of urgent need (optional).</p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Emergency Contact Name"
              name="emergencyContactName"
              value={formData.emergencyContactName}
              onChange={handleChange}
              placeholder="e.g. Rajesh Sharma (Father)"
              error={fieldErrors.emergencyContactName}
            />

            <Input
              label="Emergency Contact Phone"
              name="emergencyContactPhone"
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={handleChange}
              placeholder="e.g. +91 91234 56789"
              error={fieldErrors.emergencyContactPhone}
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500">
            {profileCompletedAt ? (
              <span>Last confirmed: {new Date(profileCompletedAt).toLocaleDateString()}</span>
            ) : (
              <span>Fill required fields to complete profile.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button
              type="submit"
              variant="primary"
              loading={saving}
              disabled={saving}
            >
              {saving ? "Saving Profile..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
