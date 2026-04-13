export interface SelectOption {
  value: string;
  label: string;
}

export const DEPOT_OPTIONS: SelectOption[] = [
  { value: "BRISBANE", label: "Brisbane" },
  { value: "HERVEY_BAY", label: "Hervey Bay" },
  { value: "BUNDABERG", label: "Bundaberg" },
  { value: "MACKAY", label: "Mackay" },
];

export const JOB_TYPE_OPTIONS: SelectOption[] = [
  { value: "QUOTE", label: "Quote" },
  { value: "DIRECT_WORK_ORDER", label: "Direct Work Order" },
];

export const CLIENT_OPTIONS: SelectOption[] = [
  { value: "Aarnet", label: "Aarnet" },
  { value: "AMS Construction", label: "AMS Construction" },
  { value: "AP Hire", label: "AP Hire" },
  { value: "Aspire Plumbing", label: "Aspire Plumbing" },
  { value: "Barcam", label: "Barcam" },
  { value: "Boddington Gold Mine", label: "Boddington Gold Mine" },
  { value: "BowenRail", label: "BowenRail" },
  { value: "Bundaberg Regional Council", label: "Bundaberg Regional Council" },
  { value: "Central Highlands Council", label: "Central Highlands Council" },
  { value: "CINC Whelan Electrical", label: "CINC Whelan Electrical" },
  { value: "Citecon", label: "Citecon" },
  { value: "Clyton Telecomm", label: "Clyton Telecomm" },
  { value: "ColRichards Constructions", label: "ColRichards Constructions" },
  { value: "Conduit Installations", label: "Conduit Installations" },
  { value: "Decon", label: "Decon" },
  { value: "Devcon", label: "Devcon" },
  { value: "Downer", label: "Downer" },
  { value: "Fergus Builders", label: "Fergus Builders" },
  { value: "First Choice Telecoms", label: "First Choice Telecoms" },
  { value: "Fraser Coast Regional Council", label: "Fraser Coast Regional Council" },
  { value: "Gaylor Property Developments", label: "Gaylor Property Developments" },
  { value: "Genus", label: "Genus" },
  { value: "GND Civil", label: "GND Civil" },
  { value: "Haber Excavations Pty Ltd", label: "Haber Excavations Pty Ltd" },
  { value: "Hansen Yuncken", label: "Hansen Yuncken" },
  { value: "High Force", label: "High Force" },
  { value: "HNA Electrical", label: "HNA Electrical" },
  { value: "Hotondo Homes", label: "Hotondo Homes" },
  { value: "Hunter Contractors", label: "Hunter Contractors" },
  { value: "IDC Construct", label: "IDC Construct" },
  { value: "JCM Civil", label: "JCM Civil" },
  { value: "JGP Electrical CQ PTY LTD", label: "JGP Electrical CQ PTY LTD" },
  { value: "JRT", label: "JRT" },
  { value: "Klenner Murphy Electrical", label: "Klenner Murphy Electrical" },
  { value: "Kronks", label: "Kronks" },
  { value: "Lectel", label: "Lectel" },
  { value: "Mackay Regional Council", label: "Mackay Regional Council" },
  { value: "Mirait", label: "Mirait" },
  { value: "Muller", label: "Muller" },
  { value: "NSW SES", label: "NSW SES" },
  { value: "O'Brian", label: "O'Brian" },
  { value: "Office Automation", label: "Office Automation" },
  { value: "Opticomm", label: "Opticomm" },
  { value: "OpusV Tech Group", label: "OpusV Tech Group" },
  { value: "Paynters", label: "Paynters" },
  { value: "Peracon", label: "Peracon" },
  { value: "PON Projects", label: "PON Projects" },
  { value: "PowerUp", label: "PowerUp" },
  { value: "Premise", label: "Premise" },
  { value: "Private Client", label: "Private Client" },
  { value: "Private Client, Opticomm", label: "Private Client, Opticomm" },
  { value: "Proserpine electrical", label: "Proserpine electrical" },
  { value: "Radlink", label: "Radlink" },
  { value: "RoadTek TMR", label: "RoadTek TMR" },
  { value: "Sanctuary Cove FTTH", label: "Sanctuary Cove FTTH" },
  { value: "See Civil", label: "See Civil" },
  { value: "SEME Solutions", label: "SEME Solutions" },
  { value: "SEQ Electrical", label: "SEQ Electrical" },
  { value: "Service Stream", label: "Service Stream" },
  { value: "SGQ Wide Bay", label: "SGQ Wide Bay" },
  { value: "SNT Electrical", label: "SNT Electrical" },
  { value: "Southern Cross", label: "Southern Cross" },
  { value: "Spiecapag", label: "Spiecapag" },
  { value: "Stanke Group Electrics", label: "Stanke Group Electrics" },
  { value: "Sunfam", label: "Sunfam" },
  { value: "Superloop", label: "Superloop" },
  { value: "Synergy Pipelines & Plumbing", label: "Synergy Pipelines & Plumbing" },
  { value: "Telstra", label: "Telstra" },
  { value: "Tweed Shire Council", label: "Tweed Shire Council" },
  { value: "UGL", label: "UGL" },
  { value: "Vassallo", label: "Vassallo" },
  { value: "Ventia", label: "Ventia" },
  { value: "Wabtec", label: "Wabtec" },
  { value: "Ward", label: "Ward" },
  { value: "WDC", label: "WDC" },
  { value: "Weird Overhead Solutions", label: "Weird Overhead Solutions" },
  { value: "Wide Bay Water", label: "Wide Bay Water" },
  { value: "Zenith", label: "Zenith" },
  { value: "Zinfra", label: "Zinfra" },
];

export const CONTRACT_OPTIONS: SelectOption[] = [
  { value: "ARCW", label: "ARCW" },
  { value: "IEN Rehab", label: "IEN Rehab" },
  { value: "N2P", label: "N2P" },
  { value: "N2P 622K", label: "N2P 622K" },
  { value: "N2P622K", label: "N2P622K" },
  { value: "NDM", label: "NDM" },
  { value: "ODM", label: "ODM" },
  { value: "ODMS", label: "ODMS" },
  { value: "Powerup", label: "Powerup" },
  { value: "Private Client", label: "Private Client" },
  { value: "RW", label: "RW" },
  { value: "TFO", label: "TFO" },
  { value: "TSFMDCC NDC + ARCW", label: "TSFMDCC NDC + ARCW" },
  { value: "Unify", label: "Unify" },
  { value: "Unify - Field Module", label: "Unify - Field Module" },
  { value: "WBA", label: "WBA" },
  { value: "Wideband", label: "Wideband" },
];

export const JOB_REQUEST_STATUS_OPTIONS: SelectOption[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending Review" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
];

export const DEPOT_LABELS: Record<string, string> = {
  BRISBANE: "Brisbane",
  HERVEY_BAY: "Hervey Bay",
  BUNDABERG: "Bundaberg",
  MACKAY: "Mackay",
};

export const JOB_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote",
  DIRECT_WORK_ORDER: "Direct Work Order",
};

export const JOB_REQUEST_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300",
  PENDING_REVIEW: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  APPROVED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export const JOB_TYPE_COLORS: Record<string, string> = {
  QUOTE: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  DIRECT_WORK_ORDER: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};
