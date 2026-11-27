-- ClassRelay core schema (Master Prompt section 8). SYNTHETIC DEMO PLATFORM.
-- Every table carries district_id; RLS is enabled and policies are written in this same file (CLAUDE.md section 4).
-- JWT claims expected: district_id, app_role (substitute | teacher | school_admin | district_admin),
-- school_id, teacher_id, substitute_id. The service role bypasses RLS for migrations and seed only.

create extension if not exists pgcrypto;
create extension if not exists vector;
create extension if not exists btree_gist;

-- ---------- claim helpers ----------
create or replace function app_district() returns text language sql stable as $fn$ select auth.jwt() ->> 'district_id' $fn$;
create or replace function app_role() returns text language sql stable as $fn$ select auth.jwt() ->> 'app_role' $fn$;
create or replace function app_school() returns text language sql stable as $fn$ select auth.jwt() ->> 'school_id' $fn$;
create or replace function app_teacher() returns text language sql stable as $fn$ select auth.jwt() ->> 'teacher_id' $fn$;
create or replace function app_sub() returns text language sql stable as $fn$ select auth.jwt() ->> 'substitute_id' $fn$;
create or replace function is_district_admin() returns boolean language sql stable as $fn$ select app_role() = 'district_admin' $fn$;
create or replace function is_admin() returns boolean language sql stable as $fn$ select app_role() in ('district_admin', 'school_admin') $fn$;

-- ---------- tenancy ----------
create table district (
  id text primary key,
  district_id text generated always as (id) stored,
  name text not null,
  region text not null,
  timezone text not null default 'America/Chicago',
  data_residency text not null default 'US',
  rule_pack_id text not null,
  approval_required boolean not null default true,
  t4_annual_day_limit int not null default 90
);
alter table district enable row level security;
create policy district_read on district for select using (id = app_district());
create policy district_admin_write on district for update using (id = app_district() and is_district_admin());

create table school (
  id text primary key,
  district_id text not null references district(id),
  name text not null,
  short text not null,
  level text not null check (level in ('Elementary', 'Middle', 'High')),
  grade_bands text[] not null,
  address text not null,
  x numeric not null,
  y numeric not null,
  bell_start time not null,
  bell_end time not null,
  periods jsonb not null default '[]',
  hard_to_fill boolean not null default false,
  arrival_notes text not null default '',
  duty_notes text not null default '',
  budget_code text not null,
  excluded_sub_ids text[] not null default '{}'
);
alter table school enable row level security;
create policy school_read on school for select using (district_id = app_district());
create policy school_admin_write on school for update using (
  district_id = app_district() and (is_district_admin() or (app_role() = 'school_admin' and id = app_school()))
);

create table role (
  id text primary key check (id in ('substitute', 'teacher', 'school_admin', 'district_admin')),
  district_id text not null references district(id),
  description text not null
);
alter table role enable row level security;
create policy role_read on role for select using (district_id = app_district());

create table app_user (
  id text primary key,
  district_id text not null references district(id),
  auth_uid uuid unique,
  name text not null,
  email text not null,
  role text not null references role(id),
  school_id text references school(id),
  teacher_id text,
  substitute_id text,
  language text not null default 'en' check (language in ('en', 'bn', 'es'))
);
alter table app_user enable row level security;
create policy user_self on app_user for select using (district_id = app_district() and (auth_uid = auth.uid() or is_admin()));
create policy user_admin_write on app_user for all using (district_id = app_district() and is_district_admin()) with check (district_id = app_district());

create table teacher (
  id text primary key,
  district_id text not null references district(id),
  school_id text not null references school(id),
  name text not null,
  subject text not null,
  grade_band text not null,
  classes jsonb not null default '[]',
  preferred_sub_ids text[] not null default '{}',
  excluded_sub_ids text[] not null default '{}',
  routines text not null default '',
  behavior_plan text not null default '',
  seating_notes text not null default '',
  language text not null default 'en'
);
alter table teacher enable row level security;
create policy teacher_read on teacher for select using (
  district_id = app_district() and (
    is_district_admin() or (app_role() = 'school_admin' and school_id = app_school()) or id = app_teacher() or app_role() = 'substitute'
  )
);
create policy teacher_write on teacher for update using (
  district_id = app_district() and (id = app_teacher() or (app_role() = 'school_admin' and school_id = app_school()))
);

create table substitute (
  id text primary key,
  district_id text not null references district(id),
  name text not null,
  email text not null,
  phone text not null,
  tier text not null check (tier in ('T1', 'T2', 'T3', 'T4')),
  stage text not null check (stage in ('applied', 'documents', 'verification', 'orientation', 'active', 'paused')),
  subjects text[] not null,
  grade_bands text[] not null,
  preferred_school_ids text[] not null default '{}',
  available_days int[] not null default '{1,2,3,4,5}',
  max_distance numeric not null,
  x numeric not null,
  y numeric not null,
  languages text[] not null default '{en}',
  reliability numeric not null check (reliability between 0 and 1),
  rating numeric not null check (rating between 0 and 5),
  days_this_year int not null default 0,
  offers_last_30 int not null default 0,
  joined_at date not null,
  pause_reason text
  -- Deliberately no protected attributes (age, race, gender, disability, religion): matching cannot use them.
);
alter table substitute enable row level security;
create policy sub_read on substitute for select using (district_id = app_district() and (id = app_sub() or is_admin()));
create policy sub_write on substitute for update using (district_id = app_district() and (id = app_sub() or is_district_admin()));

create table credential_rule (
  id text primary key,
  district_id text not null references district(id),
  rule_pack_id text not null,
  title text not null,
  body text not null,
  version text not null,
  effective_date date not null
);
alter table credential_rule enable row level security;
create policy cred_rule_read on credential_rule for select using (district_id = app_district());
create policy cred_rule_write on credential_rule for all using (district_id = app_district() and is_district_admin()) with check (district_id = app_district());

create table credential (
  id text primary key,
  district_id text not null references district(id),
  substitute_id text not null references substitute(id),
  type text not null,
  number text not null,
  issuer text not null,
  issue_date date not null,
  expiry_date date,
  status text not null check (status in ('verified', 'needs_review', 'expired', 'missing', 'pending', 'rejected')),
  confidence numeric,
  document_name text,
  verified_by text,
  verified_at timestamptz,
  review_note text,
  constraint credential_expiry_after_issue check (expiry_date is null or expiry_date > issue_date)
);
alter table credential enable row level security;
create policy cred_read on credential for select using (district_id = app_district() and (substitute_id = app_sub() or is_admin()));
create policy cred_upload on credential for insert with check (district_id = app_district() and (substitute_id = app_sub() or is_district_admin()));
create policy cred_review on credential for update using (district_id = app_district() and is_district_admin());

create table availability (
  id text primary key,
  district_id text not null references district(id),
  substitute_id text not null references substitute(id),
  weekday int not null check (weekday between 0 and 6),
  day_part text not null default 'full',
  blocked_date date
);
alter table availability enable row level security;
create policy avail_own on availability for all
  using (district_id = app_district() and (substitute_id = app_sub() or is_admin()))
  with check (district_id = app_district() and (substitute_id = app_sub() or is_district_admin()));

create table preference (
  id text primary key,
  district_id text not null references district(id),
  owner_kind text not null check (owner_kind in ('teacher', 'school', 'substitute')),
  owner_id text not null,
  target_id text not null,
  kind text not null check (kind in ('preferred', 'excluded'))
);
alter table preference enable row level security;
create policy pref_read on preference for select using (district_id = app_district() and (is_admin() or owner_id = app_teacher()));
create policy pref_write on preference for all
  using (district_id = app_district() and (is_admin() or owner_id = app_teacher()))
  with check (district_id = app_district());

-- ---------- relay loop ----------
create table lesson_plan (
  id text primary key,
  district_id text not null references district(id),
  teacher_id text not null references teacher(id),
  title text not null,
  date date,
  emergency boolean not null default false,
  source text not null,
  periods jsonb not null default '[]',
  updated_at timestamptz not null default now()
);
alter table lesson_plan enable row level security;
create policy plan_owner on lesson_plan for all
  using (district_id = app_district() and (teacher_id = app_teacher() or is_admin()))
  with check (district_id = app_district() and (teacher_id = app_teacher() or is_admin()));

create table absence (
  id text primary key,
  district_id text not null references district(id),
  school_id text not null references school(id),
  teacher_id text not null references teacher(id),
  start_date date not null,
  end_date date not null,
  day_part text not null check (day_part in ('full', 'am', 'pm')),
  periods int[] not null default '{}',
  reason text not null,
  notice_type text not null,
  status text not null check (status in ('reported', 'approved', 'matching', 'offered', 'filled', 'in_progress', 'completed', 'paid', 'cancelled')),
  notes text not null default '',
  plan_id text references lesson_plan(id),
  reported_via text not null,
  created_at timestamptz not null default now(),
  filled_at timestamptz,
  current_wave int not null default 0 check (current_wave between 0 and 3),
  sped boolean not null default false,
  cancel_reason text,
  constraint absence_dates check (end_date >= start_date)
);
alter table absence enable row level security;
create policy absence_read on absence for select using (
  district_id = app_district() and (is_district_admin() or (app_role() = 'school_admin' and school_id = app_school()) or teacher_id = app_teacher())
);
create policy absence_insert on absence for insert with check (district_id = app_district() and (teacher_id = app_teacher() or is_admin()));
create policy absence_update on absence for update using (
  district_id = app_district() and (is_district_admin() or (app_role() = 'school_admin' and school_id = app_school()) or teacher_id = app_teacher())
);

create table compliance_check (
  id text primary key,
  district_id text not null references district(id),
  substitute_id text not null references substitute(id),
  absence_id text not null references absence(id),
  date date not null,
  passed boolean not null,
  violations jsonb not null default '[]',
  warnings jsonb not null default '[]',
  checked_at timestamptz not null default now()
);
alter table compliance_check enable row level security;
create policy cc_read on compliance_check for select using (district_id = app_district() and (is_admin() or substitute_id = app_sub()));

create table offer (
  id text primary key,
  district_id text not null references district(id),
  absence_id text not null references absence(id),
  substitute_id text not null references substitute(id),
  wave int not null check (wave between 1 and 3),
  status text not null check (status in ('pending', 'accepted', 'declined', 'expired', 'superseded')),
  score numeric not null,
  reasons text[] not null default '{}',
  pay numeric not null,
  distance numeric not null,
  sent_at timestamptz not null,
  responded_at timestamptz
);
-- At most one accepted offer per absence.
create unique index offer_one_accepted_per_absence on offer (absence_id) where status = 'accepted';
alter table offer enable row level security;
create policy offer_read on offer for select using (district_id = app_district() and (substitute_id = app_sub() or is_admin()));
create policy offer_respond on offer for update using (district_id = app_district() and substitute_id = app_sub());

create table assignment (
  id text primary key,
  district_id text not null references district(id),
  absence_id text not null references absence(id),
  substitute_id text not null references substitute(id),
  school_id text not null references school(id),
  date date not null,
  day_part text not null check (day_part in ('full', 'am', 'pm')),
  slot tstzrange not null, -- bell window for this day part
  status text not null check (status in ('accepted', 'in_progress', 'completed', 'cancelled', 'no_show')),
  day_number int not null default 1 check (day_number >= 1),
  compliance_check_id text not null references compliance_check(id),
  accepted_at timestamptz not null,
  check_in_at timestamptz,
  check_out_at timestamptz,
  cancel_reason text,
  -- No overlapping live assignments for one substitute.
  constraint assignment_no_overlap exclude using gist (substitute_id with =, slot with &&) where (status not in ('cancelled', 'no_show'))
);
alter table assignment enable row level security;
create policy asg_read on assignment for select using (
  district_id = app_district() and (
    substitute_id = app_sub() or is_district_admin() or (app_role() = 'school_admin' and school_id = app_school())
    or absence_id in (select id from absence where teacher_id = app_teacher())
  )
);
create policy asg_update on assignment for update using (district_id = app_district() and (substitute_id = app_sub() or is_admin()));

create table sub_brief (
  id text primary key,
  district_id text not null references district(id),
  assignment_id text not null references assignment(id),
  language text not null,
  content jsonb not null,
  meta jsonb not null,
  created_at timestamptz not null default now()
);
alter table sub_brief enable row level security;
create policy brief_read on sub_brief for select using (
  district_id = app_district() and (
    is_admin()
    or assignment_id in (select id from assignment where substitute_id = app_sub())
    or assignment_id in (select a.id from assignment a join absence b on b.id = a.absence_id where b.teacher_id = app_teacher())
  )
);

create table day_report (
  id text primary key,
  district_id text not null references district(id),
  assignment_id text not null references assignment(id),
  covered jsonb not null,
  attendance_notes text not null default '',
  behavior_notes text not null default '',
  materials text not null default '',
  message text not null default '',
  submitted_at timestamptz not null default now()
);
alter table day_report enable row level security;
create policy report_insert on day_report for insert with check (
  district_id = app_district() and assignment_id in (select id from assignment where substitute_id = app_sub())
);
create policy report_read on day_report for select using (
  district_id = app_district() and (
    is_admin()
    or assignment_id in (select id from assignment where substitute_id = app_sub())
    or assignment_id in (select a.id from assignment a join absence b on b.id = a.absence_id where b.teacher_id = app_teacher())
  )
);

create table handoff (
  id text primary key,
  district_id text not null references district(id),
  assignment_id text not null references assignment(id),
  teacher_id text not null references teacher(id),
  taught text[] not null,
  gaps text[] not null,
  next_steps text[] not null,
  follow_ups text[] not null,
  continuity_score numeric not null check (continuity_score between 0 and 1),
  meta jsonb not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);
alter table handoff enable row level security;
create policy handoff_read on handoff for select using (district_id = app_district() and (teacher_id = app_teacher() or is_admin()));
create policy handoff_mark_read on handoff for update using (district_id = app_district() and teacher_id = app_teacher());

create table pay_rule (
  id text primary key,
  district_id text not null references district(id),
  key text not null,
  value numeric not null,
  version text not null,
  effective_date date not null
);
alter table pay_rule enable row level security;
create policy pay_rule_read on pay_rule for select using (district_id = app_district());
create policy pay_rule_write on pay_rule for all using (district_id = app_district() and is_district_admin()) with check (district_id = app_district());

create table pay_run (
  id text primary key,
  district_id text not null references district(id),
  period_start date not null,
  period_end date not null,
  status text not null check (status in ('draft', 'approved', 'exported')),
  timesheet_ids text[] not null,
  total numeric not null,
  created_at timestamptz not null default now(),
  approved_by text
);
alter table pay_run enable row level security;
create policy pay_run_admin on pay_run for all using (district_id = app_district() and is_district_admin()) with check (district_id = app_district());

create table timesheet (
  id text primary key,
  district_id text not null references district(id),
  assignment_id text not null references assignment(id),
  substitute_id text not null references substitute(id),
  school_id text not null references school(id),
  date date not null,
  day_part text not null,
  hours numeric not null check (hours >= 0),
  rate numeric not null,
  lines jsonb not null,
  amount numeric not null,
  status text not null check (status in ('submitted', 'approved', 'exported', 'paid', 'rejected')),
  anomalies jsonb not null default '[]',
  budget_code text not null,
  pay_run_id text references pay_run(id),
  approved_by text,
  created_at timestamptz not null default now()
);
alter table timesheet enable row level security;
create policy ts_read on timesheet for select using (
  district_id = app_district() and (substitute_id = app_sub() or is_district_admin() or (app_role() = 'school_admin' and school_id = app_school()))
);
create policy ts_approve on timesheet for update using (
  district_id = app_district() and (is_district_admin() or (app_role() = 'school_admin' and school_id = app_school()))
);

-- ---------- AI, memory, knowledge ----------
create table agent_run (
  id text primary key,
  district_id text not null references district(id),
  agent text not null,
  input_summary text not null,
  sources jsonb not null default '[]',
  tool_calls jsonb not null default '[]',
  output text not null,
  confidence numeric not null,
  latency_ms int not null,
  cost_usd numeric not null,
  model text not null,
  mode text not null check (mode in ('live', 'sample')),
  status text not null check (status in ('ok', 'needs_review', 'blocked', 'error')),
  guardian_notes text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table agent_run enable row level security;
create policy agent_run_insert on agent_run for insert with check (district_id = app_district());
create policy agent_run_read on agent_run for select using (district_id = app_district() and is_admin());

create table memory (
  id text primary key,
  district_id text not null references district(id),
  type text not null check (type in ('working', 'episodic', 'semantic', 'procedural')),
  scope text not null,
  content text not null,
  source text not null,
  confidence numeric not null,
  consent_basis text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);
alter table memory enable row level security;
create policy memory_admin on memory for all using (district_id = app_district() and is_district_admin()) with check (district_id = app_district());
create policy memory_sub_own on memory for select using (district_id = app_district() and scope = 'substitute:' || app_sub());

create table kb_chunk (
  id text primary key,
  district_id text not null references district(id),
  source text not null,
  section text not null,
  text text not null,
  version text not null,
  effective_date date not null,
  review_by date not null,
  embedding vector(1024)
);
create index kb_chunk_embedding_idx on kb_chunk using hnsw (embedding vector_cosine_ops);
alter table kb_chunk enable row level security;
create policy kb_read on kb_chunk for select using (district_id = app_district());
create policy kb_write on kb_chunk for all using (district_id = app_district() and is_district_admin()) with check (district_id = app_district());

create table kg_node (
  id text primary key,
  district_id text not null references district(id),
  kind text not null check (kind in ('substitute', 'credential', 'subject', 'grade', 'school', 'teacher', 'rule')),
  label text not null
);
alter table kg_node enable row level security;
create policy kg_node_read on kg_node for select using (district_id = app_district() and is_admin());

create table kg_edge (
  id bigserial primary key,
  district_id text not null references district(id),
  from_id text not null references kg_node(id),
  to_id text not null references kg_node(id),
  rel text not null check (rel in ('HOLDS', 'QUALIFIES_FOR', 'PREFERS', 'EXCLUDED_FROM', 'APPLIES_TO', 'TEACHES_AT'))
);
alter table kg_edge enable row level security;
create policy kg_edge_read on kg_edge for select using (district_id = app_district() and is_admin());

create table consent (
  id text primary key,
  district_id text not null references district(id),
  subject_id text not null,
  purpose text not null,
  basis text not null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz
);
alter table consent enable row level security;
create policy consent_read on consent for select using (
  district_id = app_district() and (subject_id = app_sub() or subject_id = app_teacher() or is_district_admin())
);
create policy consent_write on consent for all
  using (district_id = app_district() and (subject_id = app_sub() or subject_id = app_teacher()))
  with check (district_id = app_district());

-- ---------- append-only, hash-chained audit ledger ----------
create table audit_event (
  seq bigserial primary key,
  id text not null unique,
  district_id text not null references district(id),
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  entity text not null,
  payload jsonb not null,
  prev_hash text not null default '',
  hash text not null default ''
);

-- hash = sha256(prev_hash || payload); prev_hash is the last hash in the same district (genesis = 64 zeros).
create or replace function audit_event_chain() returns trigger language plpgsql as $fn$
declare
  last_hash text;
begin
  perform pg_advisory_xact_lock(hashtext('audit_event:' || new.district_id));
  select hash into last_hash from audit_event where district_id = new.district_id order by seq desc limit 1;
  new.prev_hash := coalesce(last_hash, repeat('0', 64));
  new.hash := encode(digest(new.prev_hash || new.payload::text, 'sha256'), 'hex');
  return new;
end
$fn$;
create trigger audit_event_hash before insert on audit_event for each row execute function audit_event_chain();

create or replace function audit_event_immutable() returns trigger language plpgsql as $fn$
begin
  raise exception 'audit_event is append-only';
end
$fn$;
create trigger audit_event_no_update before update or delete on audit_event for each row execute function audit_event_immutable();
revoke update, delete, truncate on audit_event from anon, authenticated;

alter table audit_event enable row level security;
create policy audit_insert on audit_event for insert with check (district_id = app_district());
create policy audit_read on audit_event for select using (district_id = app_district() and is_admin());

-- ---------- per-visitor demo snapshot (src/data/supabase.ts) ----------
create table demo_snapshot (
  visitor_id uuid primary key,
  district_id text not null default 'dst-riverbend',
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table demo_snapshot enable row level security;
-- Each anonymous visitor (Supabase anonymous sign-in) reads and writes only their own snapshot.
create policy snapshot_own on demo_snapshot for all using (visitor_id = auth.uid()) with check (visitor_id = auth.uid());
