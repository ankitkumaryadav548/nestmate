"use client";

import { useState } from "react";
import { useToast } from "@/context/ToastContext";
import {
  Button,
  Input,
  Select,
  Textarea,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardBody,
  CardFooter,
  Badge,
  StatCard,
  ProgressBar,
  CircularScore,
  Modal,
  ConfirmDialog,
  Alert,
  Tabs,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableSkeleton,
  Skeleton,
  Spinner,
  EmptyState,
  ErrorState,
  Pagination,
  Avatar,
  Tooltip,
  Stepper,
  SectionHeader,
  PageContainer,
  ThemeToggle,
  IconSparkles,
  IconBed,
  IconBuilding,
  IconUsers,
  IconShield,
} from "@/components/ui";
import {
  AdminPageHeader,
  FilterBar,
  StatusBadge,
  ConfirmTypeDialog,
  HorizontalBars,
  StackedBar,
  DonutRing,
  Sparkline,
} from "@/components/admin";

export default function DesignSystemClient() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("tab-1");
  const [stepperIndex, setStepperIndex] = useState(1);
  const [inputValue, setInputValue] = useState("");
  const [textareaValue, setTextareaValue] = useState("");
  const [selectValue, setSelectValue] = useState("opt1");
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmTypeOpen, setConfirmTypeOpen] = useState(false);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterSelect, setFilterSelect] = useState("all");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#0b0f19] py-10 transition-colors">
      <PageContainer maxWidth="max-w-6xl">
        <SectionHeader
          title="Design System & UI Components Showcase"
          description="Interactive showcase of design tokens, variants, inputs, feedback, and typography."
          badge={<Badge variant="brand" dot pulse>Live Preview</Badge>}
          actions={<ThemeToggle />}
        />

        <div className="mt-10 space-y-12">
          {/* 1. BUTTONS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              1. Buttons
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary Gradient</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="success">Success</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Button size="sm" variant="primary">Small</Button>
              <Button size="md" variant="primary">Medium</Button>
              <Button size="lg" variant="primary">Large</Button>
              <Button variant="primary" leftIcon={<IconSparkles className="h-4 w-4" />}>
                With Icon
              </Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </section>

          {/* 2. FORM INPUTS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              2. Form Inputs & Textarea
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              <Input
                label="Standard Input"
                placeholder="Enter text..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                helperText="Standard helper guidance text"
              />
              <Input
                label="Password Input"
                type="password"
                placeholder="Enter secret..."
                defaultValue="supersecret123"
              />
              <Input
                label="Error State Input"
                placeholder="Invalid value..."
                defaultValue="invalid_email"
                error="Please provide a valid university email"
              />
              <Select
                label="Custom Select Dropdown"
                value={selectValue}
                onChange={(e) => setSelectValue(e.target.value)}
                helperText="Campus block selection"
              >
                <option value="opt1">Himalaya Block A (AC)</option>
                <option value="opt2">Nilgiri Block B (Non-AC)</option>
                <option value="opt3">Kaveri Hostel (Single)</option>
              </Select>
              <div className="sm:col-span-2">
                <Textarea
                  label="Bio / Roommate Preferences Note"
                  placeholder="Share a short note (max 200 characters)..."
                  maxLength={200}
                  value={textareaValue}
                  onChange={(e) => setTextareaValue(e.target.value)}
                  helperText="Visible to matched potential roommates"
                />
              </div>
            </div>
          </section>

          {/* 3. BADGES */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              3. Badges & Tags
            </h2>
            <div className="flex flex-wrap items-center gap-2.5">
              <Badge variant="brand">Brand</Badge>
              <Badge variant="brand" dot pulse>Live Pulse</Badge>
              <Badge variant="success" dot>Success Dot</Badge>
              <Badge variant="warning" dot>Pending</Badge>
              <Badge variant="danger" dot>Maintenance</Badge>
              <Badge variant="info">Info Notice</Badge>
              <Badge variant="neutral">Neutral</Badge>
              <Badge variant="boys">Boys Hostel</Badge>
              <Badge variant="girls">Girls Hostel</Badge>
              <Badge variant="ac">AC Room</Badge>
              <Badge variant="nonAc">Non-AC</Badge>
            </div>
          </section>

          {/* 4. STAT CARDS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              4. Stat Cards (Animated Numbers)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                accent="indigo"
                icon={<IconUsers className="h-5 w-5" />}
                label="Registered Students"
                value={342}
                trend="12% this week"
                trendDirection="up"
              />
              <StatCard
                accent="teal"
                icon={<IconBed className="h-5 w-5" />}
                label="Allocated Rooms"
                value={128}
                suffix="/150"
                trend="85% occupancy"
                trendDirection="up"
              />
              <StatCard
                accent="amber"
                icon={<IconBuilding className="h-5 w-5" />}
                label="Forming Groups"
                value={45}
                subtext="Awaiting room selection"
              />
              <StatCard
                accent="rose"
                icon={<IconShield className="h-5 w-5" />}
                label="Integrity Issues"
                value={0}
                subtext="All invariants clean"
              />
            </div>
          </section>

          {/* 5. PROGRESS & CIRCULAR SCORE */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              5. Progress Bars & Compatibility Gauges
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3">
                <ProgressBar value={92} showLabel variant="auto" />
                <ProgressBar value={64} showLabel variant="brand" />
                <ProgressBar value={40} showLabel variant="amber" />
                <ProgressBar value={15} showLabel variant="rose" />
              </div>
              <div className="flex items-center justify-around gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <CircularScore score={95} size={76} label="Match" />
                <CircularScore score={72} size={76} label="Match" />
                <CircularScore score={48} size={76} label="Match" />
                <CircularScore score={24} size={76} label="Match" />
              </div>
            </div>
          </section>

          {/* 6. TOAST SYSTEM */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              6. Toast System Trigger
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="success"
                size="sm"
                onClick={() => toast.success("Room 402 successfully claimed!", "Room Claimed")}
              >
                Trigger Success Toast
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => toast.error("Candidate violates mutual AC deal-breaker.", "Incompatible")}
              >
                Trigger Error Toast
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => toast.info("Selection window opens tomorrow at 10:00 AM.", "Selection Window")}
              >
                Trigger Info Toast
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toast.warning("Your invitation expires in 24 hours.", "Expiring Soon")}
              >
                Trigger Warning Toast
              </Button>
            </div>
          </section>

          {/* 7. CARDS & TABS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              7. Cards & Tabs
            </h2>
            <Tabs
              tabs={[
                { id: "tab-1", label: "Default Card" },
                { id: "tab-2", label: "Elevated Card" },
                { id: "tab-3", label: "Interactive Card" },
                { id: "tab-4", label: "Gradient Border" },
              ]}
              activeTab={activeTab}
              onChange={setActiveTab}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
              <Card variant={activeTab === "tab-2" ? "elevated" : activeTab === "tab-3" ? "interactive" : activeTab === "tab-4" ? "gradient-border" : "default"}>
                <CardHeader>
                  <CardTitle>Room 204 • Himalaya Block</CardTitle>
                  <CardDescription>Capacity 2 Beds • AC Room • Second Floor</CardDescription>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    This card demonstrates the current active card variant with smooth responsive styling and crisp typography.
                  </p>
                </CardBody>
                <CardFooter>
                  <Badge variant="available" dot>Available</Badge>
                  <Button size="sm" variant="primary">Select Room</Button>
                </CardFooter>
              </Card>

              <Card variant="interactive">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Interactive Hover Lift</CardTitle>
                    <CircularScore score={88} size={48} showLabel={false} />
                  </div>
                  <CardDescription>Move cursor over card to test subtle lift and shadow glow.</CardDescription>
                </CardHeader>
                <CardBody>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    Hovering reveals a soft indigo perimeter aura and negative Y displacement.
                  </p>
                </CardBody>
                <CardFooter>
                  <span className="text-xs text-slate-500">2 Seats Free</span>
                  <Button size="sm" variant="secondary">View Details</Button>
                </CardFooter>
              </Card>
            </div>
          </section>

          {/* 8. MODAL & CONFIRM DIALOG */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              8. Modals & Dialogs
            </h2>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" onClick={() => setModalOpen(true)}>
                Open Standard Modal
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                Open Confirm Dialog
              </Button>
            </div>

            <Modal
              isOpen={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Review Join Request"
              description="Review compatibility score breakdown without compromising student privacy."
              footer={
                <>
                  <Button variant="secondary" size="sm" onClick={() => setModalOpen(false)}>
                    Close
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setModalOpen(false)}>
                    Approve Member
                  </Button>
                </>
              }
            >
              <p className="leading-relaxed">
                Applicant satisfies all hard constraints (gender, room size, deal-breakers). Group average will increase by +3.2%.
              </p>
            </Modal>

            <ConfirmDialog
              isOpen={confirmOpen}
              onClose={() => setConfirmOpen(false)}
              onConfirm={() => {
                setConfirmOpen(false);
                toast.error("Roommate group was disbanded.", "Disbanded");
              }}
              title="Disband Roommate Group?"
              message="Disbanding your group will cancel all pending invitations and release your claimed room."
              confirmText="Disband Group"
            />
          </section>

          {/* 9. ALERTS */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              9. Status Alerts
            </h2>
            <div className="space-y-3">
              <Alert type="success" title="Allocation Published" message="The final room allocation plan has been published to student portals." />
              <Alert type="error" title="Cross-Gender Claim Blocked" message="Boys group cannot claim a room inside a female hostel block." />
              <Alert type="warning" title="Selection Window Ending" message="The live room selection window closes in 15 minutes." />
              <Alert type="info" title="Questionnaire Required" message="Complete your lifestyle questionnaire to activate roommate matching." />
            </div>
          </section>

          {/* 10. STEPPER */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              10. Stepper Navigation
            </h2>
            <div className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <Stepper
                steps={[
                  { id: 1, label: "Room Size", description: "1, 2, 3 or 4 beds" },
                  { id: 2, label: "Sleep & Routine", description: "Hours & schedule" },
                  { id: 3, label: "Habits", description: "Study & cleanliness" },
                  { id: 4, label: "Review", description: "Finalize submission" },
                ]}
                currentStepIndex={stepperIndex}
                onStepClick={setStepperIndex}
              />
            </div>
          </section>

          {/* 11. TABLE */}
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              11. Tables & TableSkeleton
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hostel Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Total Rooms</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow isClickable>
                  <TableCell className="font-semibold">Himalaya Hostel</TableCell>
                  <TableCell>Boys (AC / Non-AC)</TableCell>
                  <TableCell className="tabular-nums">120 Rooms</TableCell>
                  <TableCell><Badge variant="available" dot>Active</Badge></TableCell>
                </TableRow>
                <TableRow isClickable>
                  <TableCell className="font-semibold">Nilgiri Hostel</TableCell>
                  <TableCell>Girls (AC)</TableCell>
                  <TableCell className="tabular-nums">90 Rooms</TableCell>
                  <TableCell><Badge variant="available" dot>Active</Badge></TableCell>
                </TableRow>
              </TableBody>
            </Table>

            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mt-6">Table Skeleton</h3>
            <TableSkeleton rows={2} cols={4} />
          </section>

          {/* 12. AVATARS, TOOLTIPS, PAGINATION, EMPTY & ERROR STATES */}
          <section className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              12. Avatars, Tooltips, Empty & Error States
            </h2>
            <div className="flex flex-wrap items-center gap-6">
              <Avatar name="Aman Sharma" size="sm" status="online" />
              <Avatar name="Rahul Verma" size="md" status="busy" />
              <Avatar name="Priya Patel" size="lg" status="offline" />
              <Tooltip content="Verified campus registration">
                <Badge variant="brand">Hover me for Tooltip</Badge>
              </Tooltip>
              <Spinner size="md" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <EmptyState
                title="No Pending Invitations"
                description="You currently have no incoming group invitations. Browse matches to send requests."
                action={<Button size="sm" variant="primary">Browse Matches</Button>}
              />
              <ErrorState
                title="Connection Timeout"
                message="Unable to reach the allocation server. Please check your network connection."
                onRetry={() => toast.info("Retrying connection...")}
              />
            </div>

            <Pagination
              currentPage={currentPage}
              totalPages={5}
              totalItems={48}
              onPageChange={setCurrentPage}
            />
          </section>

          {/* 13. ADMIN SPECIALIZED COMPONENTS & CHARTS */}
          <section className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 border-b pb-2 border-slate-200 dark:border-slate-800">
              13. Admin Components & Analytics Charts
            </h2>

            {/* Admin Header */}
            <AdminPageHeader
              title="Admin Section Showcase"
              description="Demonstrating admin-specific headers, filters, data indicators, and pure SVG charts."
              breadcrumbs={[
                { label: "Admin", href: "/admin" },
                { label: "Design System", href: "/design-system" },
                { label: "Admin Components" },
              ]}
              actions={
                <Button size="sm" variant="outline" onClick={() => setConfirmTypeOpen(true)}>
                  Test ConfirmTypeDialog
                </Button>
              }
            />

            {/* FilterBar */}
            <FilterBar
              searchValue={filterSearch}
              onSearchChange={setFilterSearch}
              searchPlaceholder="Filter across records..."
              onClear={() => {
                setFilterSearch("");
                setFilterSelect("all");
              }}
              hasActiveFilters={filterSearch.length > 0 || filterSelect !== "all"}
            >
              <Select
                value={filterSelect}
                onChange={(e) => setFilterSelect(e.target.value)}
                className="w-40 text-xs py-1.5"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="draft">Draft Only</option>
              </Select>
            </FilterBar>

            {/* Status Badges */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Universal Status Badges</h3>
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge type="room" status="available" />
                <StatusBadge type="room" status="claimed" />
                <StatusBadge type="room" status="maintenance" />
                <StatusBadge type="run" status="draft" />
                <StatusBadge type="run" status="published" />
                <StatusBadge type="run" status="rolled_back" />
                <StatusBadge type="window" status="open" />
                <StatusBadge type="window" status="closed" />
                <StatusBadge type="score" score={94} />
                <StatusBadge type="score" score={68} />
                <StatusBadge type="score" score={42} />
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  Horizontal Bars
                </h4>
                <HorizontalBars
                  data={[
                    { label: "Himalaya Hostel", value: 180, max: 200, suffix: " / 200 beds (90%)", color: "var(--teal-500)" },
                    { label: "Nilgiri Hostel", value: 120, max: 150, suffix: " / 150 beds (80%)", color: "var(--brand-500)" },
                    { label: "Aravali Hostel", value: 65, max: 100, suffix: " / 100 beds (65%)", color: "var(--purple-500)" },
                  ]}
                />
              </Card>

              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  Stacked Progress Bar
                </h4>
                <StackedBar
                  segments={[
                    { label: "1st Choice (70)", value: 70, color: "var(--teal-500)" },
                    { label: "2nd Choice (20)", value: 20, color: "var(--brand-500)" },
                    { label: "3rd Choice (8)", value: 8, color: "var(--purple-500)" },
                    { label: "Other (2)", value: 2, color: "var(--slate-400)" },
                  ]}
                  total={100}
                />
              </Card>

              <Card className="p-5 space-y-3 flex flex-col items-center justify-center">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider self-start">
                  Donut Ring Gauge
                </h4>
                <DonutRing value={82} label="Weight Total" size={120} strokeWidth={12} />
              </Card>

              <Card className="p-5 space-y-3">
                <h4 className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">
                  Sparkline Trend
                </h4>
                <div className="flex items-center justify-between">
                  <span className="text-xl font-bold text-[var(--foreground)]">+18.4%</span>
                  <Sparkline data={[12, 18, 15, 24, 22, 35, 42]} color="var(--teal-500)" width={120} height={36} />
                </div>
              </Card>
            </div>

            {/* ConfirmTypeDialog Demo */}
            <ConfirmTypeDialog
              isOpen={confirmTypeOpen}
              onClose={() => setConfirmTypeOpen(false)}
              onConfirm={() => {
                setConfirmTypeOpen(false);
                toast.success("Confirmed typed action!");
              }}
              title="Test Typed Confirmation"
              description="Type the word CONFIRM to execute this critical action."
              requiredWord="CONFIRM"
              confirmLabel="Execute Action"
              isDestructive={false}
            >
              <Alert variant="warning">
                This dialog demonstrates typed confirmation safeguards for destructive operations.
              </Alert>
            </ConfirmTypeDialog>
          </section>
        </div>
      </PageContainer>
    </div>
  );
}

