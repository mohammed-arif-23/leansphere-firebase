import { itSupabase, ensureItSupabaseConfigured } from '@/lib/itSupabase';

export interface ITPanelStudent {
  id?: string;
  registrationNumber: string;
  name?: string;
  email?: string;
  mobile?: string;
  classYear?: string | number;
}

// Attempts to find a student in the IT Panel Supabase by registration number
// Tries multiple likely column names for compatibility: registration_number, registrationNumber, regno, reg_no
export async function findStudentByRegistrationNumber(registrationNumber: string): Promise<ITPanelStudent | null> {
  ensureItSupabaseConfigured();
  const supa = itSupabase!;

  // Your provided schema: table unified_students with columns like:
  // register_number, name, email, mobile, class_year
  const { data, error } = await supa
    .from('unified_students')
    .select('*')
    .eq('register_number', registrationNumber)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (!data) return null;

  const s: ITPanelStudent = {
    id: data.id,
    registrationNumber: data.register_number ?? registrationNumber,
    name: data.name,
    email: data.email,
    mobile: data.mobile,
    classYear: data.class_year,
  };
  return s;
}
