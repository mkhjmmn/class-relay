-- SYNTHETIC SEED. No real people, schools or student records. Riverbend Unified is fictional.
-- The full deterministic world lives in src/data/seed; this file seeds enough rows to exercise RLS.

insert into district (id, name, region, timezone, data_residency, rule_pack_id, approval_required, t4_annual_day_limit)
values ('dst-riverbend', 'Riverbend Unified School District (synthetic)', 'Synthetic state', 'America/Chicago', 'US', 'riverbend-permit-v1', true, 90);

insert into role (id, district_id, description) values
  ('substitute', 'dst-riverbend', 'Accepts offers, teaches, files day reports'),
  ('teacher', 'dst-riverbend', 'Reports absences, maintains plans, reads handoffs'),
  ('school_admin', 'dst-riverbend', 'Approves absences and timesheets for one school'),
  ('district_admin', 'dst-riverbend', 'District configuration, compliance and payroll');

insert into school (id, district_id, name, short, level, grade_bands, address, x, y, bell_start, bell_end, budget_code) values
  ('sch-1', 'dst-riverbend', 'Alder Creek Elementary (synthetic)', 'ACE', 'Elementary', '{K-2,3-5}', '100 Synthetic Way', 2, 3, '08:00', '14:45', 'RB-100'),
  ('sch-2', 'dst-riverbend', 'Birch Park Elementary (synthetic)', 'BPE', 'Elementary', '{K-2,3-5}', '200 Synthetic Way', 6, 1, '08:00', '14:45', 'RB-200'),
  ('sch-3', 'dst-riverbend', 'Cedar Hollow Middle (synthetic)', 'CHM', 'Middle', '{6-8}', '300 Synthetic Way', 4, 6, '08:15', '15:15', 'RB-300'),
  ('sch-4', 'dst-riverbend', 'Dogwood Middle (synthetic)', 'DWM', 'Middle', '{6-8}', '400 Synthetic Way', 9, 5, '08:15', '15:15', 'RB-400'),
  ('sch-5', 'dst-riverbend', 'Elm Ridge High (synthetic)', 'ERH', 'High', '{9-12}', '500 Synthetic Way', 3, 10, '07:45', '14:50', 'RB-500'),
  ('sch-6', 'dst-riverbend', 'Fir Valley High (synthetic)', 'FVH', 'High', '{9-12}', '600 Synthetic Way', 11, 9, '07:45', '14:50', 'RB-600');

insert into substitute (id, district_id, name, email, phone, tier, stage, subjects, grade_bands, max_distance, x, y, reliability, rating, joined_at) values
  ('sub-001', 'dst-riverbend', 'Maya (synthetic)', 'maya@example.test', '555-0100', 'T2', 'active', '{Math,Science}', '{6-8,9-12}', 12, 5, 5, 0.96, 4.8, '2025-09-01'),
  ('sub-007', 'dst-riverbend', 'Ethan (synthetic)', 'ethan@example.test', '555-0107', 'T1', 'verification', '{English}', '{6-8}', 10, 7, 4, 0.90, 4.4, '2026-10-01');

insert into credential (id, district_id, substitute_id, type, number, issuer, issue_date, expiry_date, status) values
  ('cred-001', 'dst-riverbend', 'sub-001', 'substitute_permit', 'SP-000001', 'Synthetic State Board', '2025-08-01', '2027-08-01', 'verified'),
  ('cred-002', 'dst-riverbend', 'sub-007', 'background_clearance', 'BG-000007', 'Synthetic Clearance Office', '2026-09-15', '2028-09-15', 'needs_review');

insert into pay_rule (id, district_id, key, value, version, effective_date) values
  ('pr-t1', 'dst-riverbend', 'daily.T1', 140, '1.0.0', '2026-08-01'),
  ('pr-t2', 'dst-riverbend', 'daily.T2', 160, '1.0.0', '2026-08-01'),
  ('pr-t3', 'dst-riverbend', 'daily.T3', 190, '1.0.0', '2026-08-01'),
  ('pr-t4', 'dst-riverbend', 'daily.T4', 200, '1.0.0', '2026-08-01');

-- prev_hash and hash are computed by the audit_event_hash trigger.
insert into audit_event (id, district_id, actor, action, entity, payload)
values ('aud-00001', 'dst-riverbend', 'system', 'seed.loaded', 'district:dst-riverbend', '{"synthetic": true}');
