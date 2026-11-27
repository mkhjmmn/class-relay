# Data dictionary

Generated from src/governance/dictionary.ts. Synthetic data only.

| PII class | Meaning | Handling |
|---|---|---|
| none | Not about a person | No restriction beyond tenant isolation |
| low | Indirect or work-context data | Role-scoped by RLS |
| moderate | Identifies an adult (name, email, preferences) | RLS + redacted before AI calls |
| high | Contact numbers, credential numbers, documents | Owner and district admin only; Guardian redacts |
| student-sensitive | Classroom notes that could relate to students (FERPA) | Need-to-know window (12 h), admin approval, every view logged |

## district

Tenant: one school district and its policy settings. Owner: District admin. Default retention: Life of contract + 90 days.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | District id, also its district_id | none | Life of contract + 90 days |
| name | text | District name | none | Life of contract + 90 days |
| region | text | State or region | none | Life of contract + 90 days |
| timezone | text | IANA timezone for bell schedules | none | Life of contract + 90 days |
| data_residency | text | Hosting region for all tenant data (default US) | none | Life of contract + 90 days |
| rule_pack_id | text | Active credential rule pack | none | Life of contract + 90 days |
| approval_required | boolean | Absences need admin approval before matching | none | Life of contract + 90 days |
| t4_annual_day_limit | int | Retiree annual day cap (R5) | none | Life of contract + 90 days |

## school

School profile, bell schedule and arrival notes. Owner: School admin. Default retention: Life of contract + 90 days.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Life of contract + 90 days |
| district_id | text | Tenant key used by every RLS policy | none | Life of contract + 90 days |
| name | text | School name | none | Life of contract + 90 days |
| level | text | Elementary / Middle / High | none | Life of contract + 90 days |
| address | text | Public school address | none | Life of contract + 90 days |
| bell_start / bell_end | time | Bell window used by pay and overlap checks | none | Life of contract + 90 days |
| periods | jsonb | Period schedule (n, label, start, end) | none | Life of contract + 90 days |
| hard_to_fill | boolean | Adds hard-to-fill pay bonus | none | Life of contract + 90 days |
| arrival_notes / duty_notes | text | Parking, sign-in, duties for substitutes | low | Life of contract + 90 days |
| budget_code | text | Payroll cost center | none | Life of contract + 90 days |
| excluded_sub_ids | text[] | Exclusion list (R6) | moderate | Life of contract + 90 days |

## role

The four application roles. Owner: Platform. Default retention: Permanent.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Permanent |
| district_id | text | Tenant key used by every RLS policy | none | Permanent |
| description | text | What the role can do | none | Permanent |

## app_user

Login identity mapped to a role. Owner: District admin. Default retention: Account life + 30 days.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Account life + 30 days |
| district_id | text | Tenant key used by every RLS policy | none | Account life + 30 days |
| auth_uid | uuid | Supabase auth subject | moderate | Account life + 30 days |
| name | text | Display name | moderate | Account life + 30 days |
| email | text | Work email | moderate | Account life + 30 days |
| role | text | Role id | none | Account life + 30 days |
| school_id / teacher_id / substitute_id | text | Scope links used by RLS claims | low | Account life + 30 days |
| language | text | UI language en/bn/es | low | Account life + 30 days |

## teacher

Teacher profile, classes and continuity notes. Owner: Teacher. Default retention: Employment + 1 year.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Employment + 1 year |
| district_id | text | Tenant key used by every RLS policy | none | Employment + 1 year |
| school_id | text | Home school | none | Employment + 1 year |
| name | text | Teacher name | moderate | Employment + 1 year |
| subject / grade_band | text | Teaching assignment | none | Employment + 1 year |
| classes | jsonb | Class sections with room, period and student count (no student names) | low | Employment + 1 year |
| preferred_sub_ids / excluded_sub_ids | text[] | Matching preferences | moderate | Employment + 1 year |
| routines | text | Class routines for substitutes | low | Employment + 1 year |
| behavior_plan / seating_notes | text | Classroom-level notes; never individual diagnoses | student-sensitive | School year + 30 days |

## substitute

Substitute profile used by matching (no protected attributes). Owner: Substitute. Default retention: Last assignment + 3 years (employment records).

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Last assignment + 3 years (employment records) |
| district_id | text | Tenant key used by every RLS policy | none | Last assignment + 3 years (employment records) |
| name | text | Substitute name | moderate | Last assignment + 3 years (employment records) |
| email / phone | text | Contact for offers | high | Last assignment + 3 years (employment records) |
| tier | text | T1-T4 credential tier | low | Last assignment + 3 years (employment records) |
| stage | text | Onboarding pipeline stage | low | Last assignment + 3 years (employment records) |
| subjects / grade_bands | text[] | Qualifications for matching | low | Last assignment + 3 years (employment records) |
| available_days / max_distance / preferred_school_ids | mixed | Availability and preferences | low | Last assignment + 3 years (employment records) |
| x / y | numeric | Synthetic home grid coordinate for distance (no street address stored) | moderate | Last assignment + 3 years (employment records) |
| reliability / rating | numeric | Performance signals used in ranking | moderate | Last assignment + 3 years (employment records) |
| days_this_year / offers_last_30 | int | Workload and fairness counters | low | Last assignment + 3 years (employment records) |
| pause_reason | text | Why matching is paused | moderate | Last assignment + 3 years (employment records) |

## credential_rule

Versioned rule pack text (R1-R8). Owner: District admin. Default retention: Permanent (versioned).

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Permanent (versioned) |
| district_id | text | Tenant key used by every RLS policy | none | Permanent (versioned) |
| rule_pack_id / version / effective_date | text/date | Rule provenance | none | Permanent (versioned) |
| title / body | text | Plain-language rule | none | Permanent (versioned) |

## credential

Permits, licenses and clearances. Owner: Substitute / HR. Default retention: Expiry + 3 years.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Expiry + 3 years |
| district_id | text | Tenant key used by every RLS policy | none | Expiry + 3 years |
| substitute_id | text | Holder | low | Expiry + 3 years |
| type | text | Credential type | low | Expiry + 3 years |
| number | text | Credential number | high | Expiry + 3 years |
| issuer | text | Issuing body | low | Expiry + 3 years |
| issue_date / expiry_date | date | Validity (check: expiry > issue) | low | Expiry + 3 years |
| status / confidence | text/numeric | Verification state and AI extraction confidence | low | Expiry + 3 years |
| document_name | text | Uploaded file name (document bytes are not retained in the demo) | high | Verification + 30 days |
| verified_by / verified_at / review_note | text | Human reviewer trail | low | Expiry + 3 years |

## availability

Weekly availability and blocked dates. Owner: Substitute. Default retention: Rolling 12 months.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Rolling 12 months |
| district_id | text | Tenant key used by every RLS policy | none | Rolling 12 months |
| substitute_id | text | Owner | low | Rolling 12 months |
| weekday / day_part / blocked_date | mixed | Availability window | low | Rolling 12 months |

## preference

Preferred and excluded pairings. Owner: Teacher / School admin. Default retention: Until removed.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Until removed |
| district_id | text | Tenant key used by every RLS policy | none | Until removed |
| owner_kind / owner_id | text | Who set it | low | Until removed |
| target_id | text | Substitute concerned | moderate | Until removed |
| kind | text | preferred / excluded | moderate | Until removed |

## absence

Teacher absence and its lifecycle state. Owner: Teacher / School admin. Default retention: School year + 3 years.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 3 years |
| district_id | text | Tenant key used by every RLS policy | none | School year + 3 years |
| school_id / teacher_id | text | Where and who | low | School year + 3 years |
| start_date / end_date / day_part / periods | mixed | When (check: end >= start) | none | School year + 3 years |
| reason | text | Coarse reason category (never medical detail) | moderate | School year + 3 years |
| notice_type / reported_via | text | Planned, short notice, same day; channel | none | School year + 3 years |
| status / current_wave | text/int | State machine position and dispatch wave | none | School year + 3 years |
| notes | text | Free-text notes for the substitute | moderate | School year + 3 years |
| sped | boolean | Special-education class (R3) | low | School year + 3 years |
| created_at / filled_at / cancel_reason | mixed | Timing for fill-rate KPIs | none | School year + 3 years |

## offer

Job offer sent to a substitute in a wave. Owner: System. Default retention: School year + 1 year.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 1 year |
| district_id | text | Tenant key used by every RLS policy | none | School year + 1 year |
| absence_id / substitute_id | text | Pairing (unique accepted offer per absence) | low | School year + 1 year |
| wave / status | int/text | Dispatch wave and response | none | School year + 1 year |
| score / reasons | numeric/text[] | Explainable ranking | low | School year + 1 year |
| pay / distance | numeric | Quoted pay and distance | low | School year + 1 year |
| sent_at / responded_at | timestamptz | Response timing | none | School year + 1 year |

## assignment

Confirmed job (no overlap per substitute via exclusion constraint). Owner: System. Default retention: School year + 3 years.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 3 years |
| district_id | text | Tenant key used by every RLS policy | none | School year + 3 years |
| absence_id / substitute_id / school_id | text | Links | low | School year + 3 years |
| date / day_part / slot | date/tstzrange | Bell window | none | School year + 3 years |
| status / day_number | text/int | Lifecycle and long-term day count | none | School year + 3 years |
| compliance_check_id | text | Eligibility evidence at acceptance | none | School year + 3 years |
| accepted_at / check_in_at / check_out_at | timestamptz | Attendance timestamps | low | School year + 3 years |

## compliance_check

Snapshot of R1-R8 evaluation. Owner: System. Default retention: School year + 5 years.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 5 years |
| district_id | text | Tenant key used by every RLS policy | none | School year + 5 years |
| substitute_id / absence_id / date | mixed | Subject of the check | low | School year + 5 years |
| passed / violations / warnings | mixed | Rule findings with rule ids | low | School year + 5 years |
| checked_at | timestamptz | When | none | School year + 5 years |

## lesson_plan

Teacher plan, uploaded or emergency. Owner: Teacher. Default retention: School year + 30 days.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 30 days |
| district_id | text | Tenant key used by every RLS policy | none | School year + 30 days |
| teacher_id | text | Author | low | School year + 30 days |
| title / date / emergency / source | mixed | Plan metadata | none | School year + 30 days |
| periods | jsonb | Objectives, activities, materials, differentiation | low | School year + 30 days |

## sub_brief

AI-generated substitute brief. Owner: System (Prep Coach). Default retention: Assignment date + 30 days.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Assignment date + 30 days |
| district_id | text | Tenant key used by every RLS policy | none | Assignment date + 30 days |
| assignment_id / language | text | Target | none | Assignment date + 30 days |
| content | jsonb | Periods, routines, approved need-to-know supports | student-sensitive | Assignment date + 30 days |
| meta | jsonb | AI mode, confidence, reasons, sources | none | Assignment date + 30 days |

## day_report

Substitute end-of-day report. Owner: Substitute. Default retention: School year + 1 year.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 1 year |
| district_id | text | Tenant key used by every RLS policy | none | School year + 1 year |
| assignment_id | text | Assignment | none | School year + 1 year |
| covered | jsonb | Per-period coverage | none | School year + 1 year |
| attendance_notes / behavior_notes | text | Class-level notes, no diagnoses | student-sensitive | School year + 30 days |
| materials / message | text | Notes to the teacher | low | School year + 1 year |

## handoff

AI handoff back to the teacher. Owner: System (Lesson Continuity). Default retention: School year + 1 year.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | School year + 1 year |
| district_id | text | Tenant key used by every RLS policy | none | School year + 1 year |
| assignment_id / teacher_id | text | Target | low | School year + 1 year |
| taught / gaps / next_steps / follow_ups | text[] | Continuity summary | low | School year + 1 year |
| continuity_score | numeric | 0..1 continuity KPI | none | School year + 1 year |
| meta / read_at | mixed | AI provenance; read receipt | none | School year + 1 year |

## pay_rule

Versioned pay parameters. Owner: District admin. Default retention: Permanent (versioned).

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Permanent (versioned) |
| district_id | text | Tenant key used by every RLS policy | none | Permanent (versioned) |
| key / value | text/numeric | e.g. daily.T2 = 160 | none | Permanent (versioned) |
| version / effective_date | text/date | Provenance | none | Permanent (versioned) |

## timesheet

Per-assignment pay record. Owner: Substitute / Payroll. Default retention: 7 years (payroll records).

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | 7 years (payroll records) |
| district_id | text | Tenant key used by every RLS policy | none | 7 years (payroll records) |
| assignment_id / substitute_id / school_id | text | Links | low | 7 years (payroll records) |
| date / day_part / hours / rate | mixed | Worked time | low | 7 years (payroll records) |
| lines / amount | jsonb/numeric | Pay breakdown | moderate | 7 years (payroll records) |
| status / anomalies / approved_by | mixed | Approval trail and anomaly codes | low | 7 years (payroll records) |
| budget_code / pay_run_id | text | Cost center and batch | none | 7 years (payroll records) |

## pay_run

Batch of approved timesheets for export. Owner: Payroll. Default retention: 7 years (payroll records).

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | 7 years (payroll records) |
| district_id | text | Tenant key used by every RLS policy | none | 7 years (payroll records) |
| period_start / period_end | date | Pay period | none | 7 years (payroll records) |
| status / timesheet_ids / total / approved_by | mixed | Approval and totals | moderate | 7 years (payroll records) |

## agent_run

One AI agent invocation (CLAUDE.md section 5). Owner: System. Default retention: 1 year.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | 1 year |
| district_id | text | Tenant key used by every RLS policy | none | 1 year |
| agent / model / mode | text | Which agent, routed model, live or sample | none | 1 year |
| input_summary | text | Redacted input summary (Guardian) | low | 1 year |
| sources / tool_calls / output | jsonb/text | Citations, tools used, output | low | 1 year |
| confidence / latency_ms / cost_usd / status | mixed | Quality, latency, spend, review state | none | 1 year |
| guardian_notes | text[] | Redactions and blocks applied | none | 1 year |

## memory

Agent memory with consent basis. Owner: District admin. Default retention: Until expires_at (max 1 year).

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Until expires_at (max 1 year) |
| district_id | text | Tenant key used by every RLS policy | none | Until expires_at (max 1 year) |
| type / scope | text | Working/episodic/semantic/procedural; who it is about | low | Until expires_at (max 1 year) |
| content | text | Remembered fact | moderate | Until expires_at (max 1 year) |
| source / confidence / consent_basis / approved | mixed | Provenance and approval | none | Until expires_at (max 1 year) |
| created_at / expires_at | timestamptz | Retention window | none | Until expires_at (max 1 year) |

## kb_chunk

Knowledge-base chunk for cited retrieval. Owner: District admin. Default retention: Until superseded + 1 year.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Until superseded + 1 year |
| district_id | text | Tenant key used by every RLS policy | none | Until superseded + 1 year |
| source / section / text | text | Policy text (public or district policy) | none | Until superseded + 1 year |
| version / effective_date / review_by | text/date | Freshness control | none | Until superseded + 1 year |
| embedding | vector(1024) | pgvector embedding | none | Until superseded + 1 year |

## kg_node

Knowledge-graph entity. Owner: System. Default retention: Rebuilt nightly.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Rebuilt nightly |
| district_id | text | Tenant key used by every RLS policy | none | Rebuilt nightly |
| kind / label | text | Entity type and label | low | Rebuilt nightly |

## kg_edge

Knowledge-graph relation. Owner: System. Default retention: Rebuilt nightly.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | bigserial | Edge id | none | Rebuilt nightly |
| district_id | text | Tenant key used by every RLS policy | none | Rebuilt nightly |
| from_id / to_id / rel | text | HOLDS, QUALIFIES_FOR, PREFERS, EXCLUDED_FROM, ... | low | Rebuilt nightly |

## consent

Consent and lawful basis records. Owner: Data subject. Default retention: Revocation + 3 years.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| id | text | Primary key (synthetic, deterministic) | none | Revocation + 3 years |
| district_id | text | Tenant key used by every RLS policy | none | Revocation + 3 years |
| subject_id | text | Person the consent is about | moderate | Revocation + 3 years |
| purpose / basis | text | Why the data is processed | none | Revocation + 3 years |
| granted_at / revoked_at | timestamptz | Consent window | none | Revocation + 3 years |

## audit_event

Append-only, hash-chained ledger. Owner: Platform. Default retention: 7 years, immutable.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| seq | bigserial | Order in the chain | none | 7 years, immutable |
| id | text | Event id | none | 7 years, immutable |
| district_id | text | Tenant key used by every RLS policy | none | 7 years, immutable |
| at / actor / action / entity | mixed | Who did what to which record | low | 7 years, immutable |
| payload | jsonb | Event detail (ids, never free-text PII) | low | 7 years, immutable |
| prev_hash / hash | text | sha256(prev_hash || payload), set by trigger | none | 7 years, immutable |

## demo_snapshot

Per-visitor sandbox state for the hosted demo. Owner: Platform. Default retention: 30 days of inactivity.

| Field | Type | Description | PII | Retention |
|---|---|---|---|---|
| visitor_id | uuid | Anonymous visitor (auth.uid()) | low | 30 days of inactivity |
| district_id | text | Tenant key used by every RLS policy | none | 30 days of inactivity |
| state | jsonb | Synthetic tenant snapshot | none | 30 days of inactivity |
| updated_at | timestamptz | Last write | none | 30 days of inactivity |

