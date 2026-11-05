"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "@/lib/axios";
import { useToast } from "@/context/ToastContext";
import useDocumentTitle from "@/hooks/useDocumentTitle";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  Button,
  Input,
  Select,
  Badge,
  Alert,
  Avatar,
  PageTransition,
  Reveal,
  IconUser,
  IconShield,
  IconCheck,
} from "@/components/ui";

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
  useDocumentTitle("Student Profile");
  const { showToast } = useToast();
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
    sharePhoneWithRoommates: true,
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
          sharePhoneWithRoommates:
            profile?.sharePhoneWithRoommates !== undefined
              ? Boolean(profile.sharePhoneWithRoommates)
              : true,
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
        const msg = "Your profile details have been saved successfully!";
        setSuccessMsg(msg);
        showToast(msg, "success");
        setProfileCompletedAt(res.data.data.profile.profileCompletedAt);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (err) {
      console.error("Save profile error:", err);
      const data = err.response?.data;
      if (data?.details && typeof data.details === "object") {
        setFieldErrors(data.details);
      }
      const errText = data?.message || "Failed to save profile. Please check the fields.";
      setErrorMsg(errText);
      showToast(errText, "error");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 py-10 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-4 bg-slate-100 dark:bg-slate-800/60 rounded w-1/2" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-72 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
          <div className="lg:col-span-2 h-96 bg-slate-100 dark:bg-slate-800/60 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="flex-1 py-6 sm:py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <Reveal direction="down">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight font-heading">
                  Student Profile
                </h1>
                {profileCompletedAt ? (
                  <Badge variant="success" size="sm" dot>
                    ✓ Profile Complete
                  </Badge>
                ) : (
                  <Badge variant="warning" size="sm" dot pulse>
                    Action Required
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Keep your academic, regional origin, and emergency contact details updated for accommodation.
              </p>
            </div>
          </div>
        </Reveal>

        {/* Alerts */}
        {successMsg && (
          <Reveal direction="down">
            <Alert variant="success" title="Success" onClose={() => setSuccessMsg("")}>
              {successMsg}
            </Alert>
          </Reveal>
        )}
        {errorMsg && (
          <Reveal direction="down">
            <Alert variant="danger" title="Error" onClose={() => setErrorMsg("")}>
              {errorMsg}
            </Alert>
          </Reveal>
        )}

        {/* Ethical Notice Banner */}
        <Reveal direction="up" delay={50}>
          <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/60 dark:bg-indigo-950/20 p-4 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-3">
            <IconShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-indigo-950 dark:text-indigo-200">
                Ethical Data Standard & Privacy Notice
              </p>
              <p className="text-indigo-800 dark:text-indigo-300/90 leading-relaxed">
                Your home region, nationality, and language fields are strictly confidential. They exist solely to ensure
                appropriate residential support, room comfort, and arrival coordination. Under university policy, demographic
                details are <strong>never</strong> used to penalize, rank, or disadvantage students in any way.
              </p>
            </div>
          </div>
        </Reveal>

        <form onSubmit={handleSubmit}>
          {/* Two-Column Desktop Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-start">
            
            {/* Left Column: Student Summary Card (Sticky on desktop) */}
            <div className="lg:col-span-1 lg:sticky lg:top-24 space-y-4">
              <Reveal direction="up" delay={100}>
                <Card variant="elevated" className="text-center p-6">
                  <div className="flex flex-col items-center">
                    <Avatar name={userData?.name || "Student"} size="xl" className="shadow-md ring-4 ring-indigo-50 dark:ring-indigo-950" />
                    <h3 className="mt-3.5 text-base font-bold text-slate-900 dark:text-slate-100 font-heading">
                      {userData?.name || "Student"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {userData?.registrationNumber || "N/A"}
                    </p>
                    <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                      <Badge variant="brand" size="sm">
                        {formData.year ? `Year ${formData.year}` : "Enrolled"}
                      </Badge>
                      <Badge variant="neutral" size="sm" className="capitalize">
                        {userData?.gender || "Student"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 text-left text-xs space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Course:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {formData.course || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Department:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {formData.department || "—"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Origin:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">
                        {[formData.homeState, formData.homeCountry].filter(Boolean).join(", ") || "—"}
                      </span>
                    </div>
                  </div>

                  {profileCompletedAt && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                      ✓ Confirmed on {new Date(profileCompletedAt).toLocaleDateString()}
                    </div>
                  )}
                </Card>
              </Reveal>
            </div>

            {/* Right Column: Form Sections */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Section 1: Academic & Contact */}
              <Reveal direction="up" delay={150}>
                <Card variant="default">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm">Academic & Contact Information</CardTitle>
                    <CardDescription className="text-xs">
                      Enrolled academic stream and verified phone for official hostel communication.
                    </CardDescription>
                  </CardHeader>
                  <CardBody className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </CardBody>
                </Card>
              </Reveal>

              {/* Section 2: Home & Travel (Geographic Origin) */}
              <Reveal direction="up" delay={200}>
                <Card variant="default">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">Home & Travel</CardTitle>
                      <CardDescription className="text-xs">
                        Regional origin helps campus services coordinate check-ins and time zones.
                      </CardDescription>
                    </div>

                    {/* International Toggle Switch */}
                    <label className="inline-flex items-center gap-2.5 cursor-pointer select-none rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-3 py-1.5 transition-colors">
                      <input
                        type="checkbox"
                        name="isInternational"
                        checked={formData.isInternational}
                        onChange={handleInternationalToggle}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-indigo-600 relative" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        International Student
                      </span>
                    </label>
                  </CardHeader>
                  <CardBody className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </CardBody>
                </Card>
              </Reveal>

              {/* Section 3: Emergency Contact */}
              <Reveal direction="up" delay={250}>
                <Card variant="default">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm">Emergency Contact</CardTitle>
                    <CardDescription className="text-xs">
                      Parent, guardian, or local contact in case of urgent accommodation need (optional).
                    </CardDescription>
                  </CardHeader>
                  <CardBody className="p-5 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  </CardBody>
                </Card>
              </Reveal>

              {/* Section 4: Privacy & Phone Sharing Switch */}
              <Reveal direction="up" delay={300}>
                <Card variant="default">
                  <CardHeader className="border-b border-slate-100 dark:border-slate-800 pb-3">
                    <CardTitle className="text-sm">Privacy & Roommate Contact Sharing</CardTitle>
                  </CardHeader>
                  <CardBody className="p-5">
                    <label className="flex items-start gap-3.5 p-4 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/30 cursor-pointer transition-colors group">
                      <input
                        type="checkbox"
                        name="sharePhoneWithRoommates"
                        id="sharePhoneWithRoommates"
                        checked={formData.sharePhoneWithRoommates}
                        onChange={handleChange}
                        className="mt-1 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      />
                      <div className="text-xs space-y-1">
                        <span className="font-bold text-slate-900 dark:text-slate-100 block">
                          Share my phone number with my roommates after room allocation
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 block leading-relaxed">
                          When enabled, your phone number will be visible to your confirmed roommates on the &quot;My Room&quot; page once accommodation is officially published. It is strictly never revealed in prospective match searches, groups, or unassigned listings.
                        </span>
                      </div>
                    </label>
                  </CardBody>
                </Card>
              </Reveal>

              {/* Sticky Save Bar on Desktop & Mobile */}
              <div className="sticky bottom-4 z-20 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 shadow-lg flex items-center justify-between gap-4">
                <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
                  {profileCompletedAt
                    ? `Last saved on ${new Date(profileCompletedAt).toLocaleDateString()}`
                    : "Fill required fields to complete profile"}
                </span>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    loading={saving}
                    disabled={saving}
                    className="w-full sm:w-auto"
                  >
                    {saving ? "Saving Profile..." : "Save Profile"}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        </form>
      </div>
    </PageTransition>
  );
}
