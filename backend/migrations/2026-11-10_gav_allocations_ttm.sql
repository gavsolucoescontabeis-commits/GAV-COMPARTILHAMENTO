-- Aplicada no Supabase do GAV Compartilhamento em 10/11/2026.
-- Dados de empregados separados por empresa e competência, sem CPF e sem salário.
create table if not exists public.gav_allocation_employees (
 company_id uuid not null references public.gav_companies(id) on delete cascade,
 year int not null check(year between 2020 and 2100),
 month int not null check(month between 1 and 12),
 employee_code text not null check(length(employee_code) between 3 and 18),
 employee_name text not null check(length(employee_name) between 2 and 180),
 source_document_id uuid references public.gav_documents(id) on delete set null,
 source_department text,
 suggested_cno text check(suggested_cno is null or suggested_cno ~ '^[0-9]{12}$'),
 imported_at timestamptz not null default now(),
 primary key(company_id,year,month,employee_code)
);
create table if not exists public.gav_allocation_worksites (
 office_id uuid not null references public.gav_offices(id) on delete cascade,
 cno text not null check(cno ~ '^[0-9]{12}$'),
 work_name text not null check(length(work_name) between 2 and 180),
 source_document_id uuid references public.gav_documents(id) on delete set null,
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 primary key(office_id,cno)
);
create table if not exists public.gav_allocation_lines (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null,
 year int not null,
 month int not null,
 employee_code text not null,
 line_no int not null check(line_no between 1 and 30),
 days_worked int not null default 0 check(days_worked between 0 and 31),
 absences int not null default 0 check(absences between 0 and 31),
 cno text check(cno is null or cno ~ '^[0-9]{12}$'),
 manual_work_name text check(manual_work_name is null or length(manual_work_name) between 2 and 180),
 updated_at timestamptz not null default now(),
 updated_by uuid references auth.users(id),
 constraint gav_allocation_lines_worker_fk foreign key(company_id,year,month,employee_code)
  references public.gav_allocation_employees(company_id,year,month,employee_code) on delete cascade,
 constraint gav_allocation_lines_no_duplicate unique(company_id,year,month,employee_code,line_no),
 constraint gav_allocation_lines_absences_once check(line_no=1 or absences=0)
);
create index if not exists gav_allocation_lines_company_month_idx on public.gav_allocation_lines(company_id,year,month);
alter table public.gav_allocation_employees enable row level security;
alter table public.gav_allocation_worksites enable row level security;
alter table public.gav_allocation_lines enable row level security;
revoke all on public.gav_allocation_employees from public,anon,authenticated;
revoke all on public.gav_allocation_worksites from public,anon,authenticated;
revoke all on public.gav_allocation_lines from public,anon,authenticated;
grant select,insert,update,delete on public.gav_allocation_employees to service_role;
grant select,insert,update,delete on public.gav_allocation_worksites to service_role;
grant select,insert,update,delete on public.gav_allocation_lines to service_role;
